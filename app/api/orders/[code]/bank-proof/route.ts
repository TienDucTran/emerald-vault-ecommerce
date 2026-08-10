// POST /api/orders/[code]/bank-proof
// Customer upload ảnh bill CK + (optional) báo "đã CK".
// Body: multipart/form-data
//   - bill: File (image/jpeg|png|webp|heic, max 5MB) — optional
//   - userConfirmed: 'true' | 'false'
//
// Response 200: { ok: true, billUrl?, userConfirmedAt }
// Response 4xx: { ok: false, error }
//
// Auth (defense-in-depth):
//   - Nếu user đang login (Supabase session): verify order.customer_id === user.id → 403 nếu sai.
//   - Nếu guest: fallback check normalizePhone(inputPhone) === normalizePhone(order.customer_phone) → 404.

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { normalizePhone } from '@/lib/phone/normalize';
import { uploadImage } from '@/lib/supabase/storage';

const BUCKET = 'payment-bills';
const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

/**
 * Auto-create storage bucket nếu chưa tồn tại (defensive).
 * Migration 0008 tạo bucket private, nhưng code dùng getPublicUrl() → cần public.
 * Supabase admin API không có "create bucket" trực tiếp, nhưng insert vào
 * storage.buckets table qua service_role sẽ tạo bucket.
 */
async function ensureBucketExists(): Promise<void> {
  const supabase = createAdminClient();
  // Check bucket exists
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = (buckets ?? []).some((b: { id: string }) => b.id === BUCKET);
  if (exists) return;
  // Create public bucket via storage API
  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: MAX_BYTES,
    allowedMimeTypes: Array.from(ALLOWED_MIME),
  });
  if (error) {
    console.error('[bank-proof] ensureBucketExists failed:', error.message);
  }
}

export async function POST(
  req: Request,
  { params }: { params: { code: string } }
) {
  const code = decodeURIComponent(params.code);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: 'INVALID_FORM_DATA' }, { status: 400 });
  }

  // Lưu phone, nhưng PHONE_REQUIRED chỉ bắt buộc với guest.
  // User đã login sẽ được verify qua customer_id (xem bước auth bên dưới).
  const phone = (form.get('phone') as string | null)?.trim() ?? '';
  const userConfirmedRaw = (form.get('userConfirmed') as string | null) ?? 'false';
  const userConfirmed = userConfirmedRaw === 'true';
  const bill = form.get('bill');

  if (!userConfirmed && !(bill instanceof File)) {
    return NextResponse.json(
      {
        ok: false,
        error: 'EMPTY_SUBMIT',
        message: 'Cần báo đã chuyển hoặc upload ảnh bill.',
      },
      { status: 400 }
    );
  }

  // Validate file nếu có
  if (bill instanceof File) {
    if (bill.size === 0) {
      return NextResponse.json(
        { ok: false, error: 'EMPTY_FILE', message: 'File ảnh rỗng.' },
        { status: 400 }
      );
    }
    if (bill.size > MAX_BYTES) {
      return NextResponse.json(
        { ok: false, error: 'FILE_TOO_LARGE', message: 'Ảnh tối đa 5MB.' },
        { status: 413 }
      );
    }
    if (!ALLOWED_MIME.has(bill.type)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'UNSUPPORTED_MIME',
          message: 'Chỉ hỗ trợ JPG, PNG, WEBP, HEIC.',
        },
        { status: 415 }
      );
    }
  }

  const supabase = createAdminClient();
  const db = supabase as any;

  // 1. Tìm order theo code (chưa verify ownership — sẽ check sau)
  const { data: order, error: orderErr } = await db
    .from('orders')
    .select('id, code, customer_phone, customer_id, status, payment_method')
    .eq('code', code)
    .maybeSingle();
  if (orderErr) {
    return NextResponse.json({ ok: false, error: orderErr.message }, { status: 500 });
  }
  if (!order) {
    return NextResponse.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 });
  }

  // 2. Auth check — branch theo session
  const ssr = createClient();
  const { data: { user } } = await ssr.auth.getUser();

  if (user) {
    // Đã login: customer_id phải khớp user.id
    if (order.customer_id !== user.id) {
      return NextResponse.json(
        { ok: false, error: 'FORBIDDEN', message: 'Bạn không có quyền với đơn này.' },
        { status: 403 }
      );
    }
  } else {
    // Guest: fallback check phone (giữ behavior cũ, trả 404)
    if (!phone) {
      return NextResponse.json(
        { ok: false, error: 'PHONE_REQUIRED', message: 'Thiếu số điện thoại xác minh.' },
        { status: 400 }
      );
    }
    if (normalizePhone(order.customer_phone) !== normalizePhone(phone)) {
      return NextResponse.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 });
    }
  }
  if (order.payment_method !== 'BANK_TRANSFER') {
    return NextResponse.json(
      { ok: false, error: 'NOT_BANK_TRANSFER', message: 'Đơn không dùng CK ngân hàng.' },
      { status: 400 }
    );
  }

  // 2. Tìm bank_transfers row
  const { data: bt, error: btErr } = await db
    .from('bank_transfers')
    .select('id, admin_confirmed_at, bill_image_url, bill_uploaded_at, qr_expires_at')
    .eq('order_id', order.id)
    .maybeSingle();
  if (btErr) {
    return NextResponse.json({ ok: false, error: btErr.message }, { status: 500 });
  }
  if (!bt) {
    return NextResponse.json(
      { ok: false, error: 'NO_BANK_TRANSFER', message: 'Không tìm thấy thông tin CK.' },
      { status: 404 }
    );
  }
  // MED #5: Chặn upload bill sau khi QR hết hạn (>24h).
  // Phía client cũng disable button, nhưng server phải enforce để chống bypass.
  if (bt.qr_expires_at && new Date(bt.qr_expires_at).getTime() < Date.now()) {
    return NextResponse.json(
      {
        ok: false,
        error: 'QR_EXPIRED',
        message: 'QR đã hết hạn, vui lòng liên hệ admin để được hỗ trợ.',
      },
      { status: 410 }
    );
  }
  if (bt.admin_confirmed_at) {
    return NextResponse.json(
      { ok: false, error: 'ALREADY_CONFIRMED', message: 'Đơn đã được admin xác nhận.' },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {};

  // 3a. Đảm bảo bucket 'payment-bills' tồn tại + public (defensive —
  //     migration 0008 tạo private bucket, nhưng code dùng getPublicUrl).
  if (bill instanceof File) {
    await ensureBucketExists();
  }

  // 3. Upload bill nếu có — dùng shared uploadImage() để thống nhất convention:
  //    - Path: `{orderId}/{slugified-filename}.{ext}` (slugify + collision detection
  //      giống admin media library)
  //    - Giữ extension gốc (jpg/png/heic...) vì bill không resize sang webp như admin
  //    - Bucket: 'payment-bills' (public bucket riêng, không trộn với 'jewelry-images')
  let billUrl: string | null = null;
  if (bill instanceof File) {
    const ext = (() => {
      switch (bill.type) {
        case 'image/jpeg':
          return 'jpg';
        case 'image/png':
          return 'png';
        case 'image/webp':
          return 'webp';
        case 'image/heic':
          return 'heic';
        case 'image/heif':
          return 'heif';
        default:
          return 'bin';
      }
    })();
    // Fallback filename nếu browser không gửi (vd: 'blob', rỗng) → dùng order code
    // cho dễ tra cứu khi admin browse bucket.
    const PLACEHOLDER = new Set(['blob', '', 'image.jpg', 'image.png', 'image.webp']);
    const filename =
      bill.name && !PLACEHOLDER.has(bill.name)
        ? bill.name
        : `${order.code}-bill.${ext}`;
    try {
      const result = await uploadImage(bill, {
        folder: order.id,
        filename,
        bucket: BUCKET,
        extension: ext,
        contentType: bill.type,
      });
      billUrl = result.publicUrl;
      updates.bill_image_url = billUrl;
      updates.bill_uploaded_at = now;
    } catch (upErr) {
      return NextResponse.json(
        {
          ok: false,
          error: 'UPLOAD_FAILED',
          message: (upErr as Error)?.message ?? 'Upload thất bại',
        },
        { status: 500 }
      );
    }
  }

  // 4. Mark user_confirmed khi user tick HOẶC upload bill.
  // Upload bill cũng là tín hiệu "user đã CK" mạnh — không bắt buộc phải tick checkbox.
  let userConfirmedAt: string | null = null;
  if (userConfirmed || billUrl) {
    if (!bt.user_confirmed_at) {
      updates.user_confirmed_at = now;
      userConfirmedAt = now;
    }
  }

  // 5. Apply updates lên bank_transfers
  if (Object.keys(updates).length > 0) {
    const { error: updErr } = await db
      .from('bank_transfers')
      .update(updates)
      .eq('id', bt.id);
    if (updErr) {
      return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });
    }
  }

  // 6. Transition WAITING_PAYMENT → WAITING_CONFIRM nếu user tick "đã CK" HOẶC upload bill.
  // Đồng bộ cả orders.status và payment_status.
  const userSignaledCompletion = userConfirmed || billUrl;
  let transitionedStatus: string | null = null;
  let transitionedPaymentStatus: string | null = null;
  if (userSignaledCompletion && order.status === 'WAITING_PAYMENT') {
    const { error: stErr } = await db
      .from('orders')
      .update({
        status: 'WAITING_CONFIRM',
        payment_status: 'AWAITING_CONFIRM',
      })
      .eq('id', order.id);
    if (stErr) {
      console.error('[bank-proof] order status update failed:', stErr);
      // Không fail request — bill đã upload thành công, chỉ là status chưa đổi.
    } else {
      transitionedStatus = 'WAITING_CONFIRM';
      transitionedPaymentStatus = 'AWAITING_CONFIRM';
    }
  }

  const billUploadedAt = billUrl ? now : bt.bill_uploaded_at;

  return NextResponse.json({
    ok: true,
    billUrl,
    billUploadedAt,
    userConfirmedAt: userConfirmedAt ?? bt.user_confirmed_at,
    orderStatus: transitionedStatus ?? order.status,
    orderPaymentStatus: transitionedPaymentStatus ?? order.payment_status,
  });
}
