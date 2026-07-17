// POST /api/orders/[code]/bank-proof
// Customer upload ảnh bill CK + (optional) báo "đã CK".
// Body: multipart/form-data
//   - bill: File (image/jpeg|png|webp|heic, max 5MB) — optional
//   - userConfirmed: 'true' | 'false'
//
// Response 200: { ok: true, billUrl?, userConfirmedAt }
// Response 4xx: { ok: false, error }
//
// Auth: guest — verify qua phone trong formData (header từ client).

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const BUCKET = 'payment-bills';
const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

function uuid(): string {
  return globalThis.crypto.randomUUID();
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

  const phone = (form.get('phone') as string | null)?.trim() ?? '';
  const userConfirmedRaw = (form.get('userConfirmed') as string | null) ?? 'false';
  const userConfirmed = userConfirmedRaw === 'true';
  const bill = form.get('bill');

  if (!phone) {
    return NextResponse.json(
      { ok: false, error: 'PHONE_REQUIRED', message: 'Thiếu số điện thoại xác minh.' },
      { status: 400 }
    );
  }
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

  // 1. Tìm order theo code + verify phone
  const { data: order, error: orderErr } = await db
    .from('orders')
    .select('id, code, customer_phone, status, payment_method')
    .eq('code', code)
    .maybeSingle();
  if (orderErr) {
    return NextResponse.json({ ok: false, error: orderErr.message }, { status: 500 });
  }
  if (!order || order.customer_phone.trim() !== phone) {
    return NextResponse.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 });
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
    .select('id, admin_confirmed_at, bill_image_url')
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
  if (bt.admin_confirmed_at) {
    return NextResponse.json(
      { ok: false, error: 'ALREADY_CONFIRMED', message: 'Đơn đã được admin xác nhận.' },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {};

  // 3. Upload bill nếu có
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
    const fileName = `${order.id}/${uuid()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, bill, {
        contentType: bill.type,
        upsert: false,
        cacheControl: '31536000',
      });
    if (upErr) {
      return NextResponse.json(
        {
          ok: false,
          error: 'UPLOAD_FAILED',
          message: upErr.message,
        },
        { status: 500 }
      );
    }
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
    billUrl = pub.publicUrl;
    updates.bill_image_url = billUrl;
    updates.bill_uploaded_at = now;
  }

  // 4. Mark user_confirmed nếu user tick
  let userConfirmedAt: string | null = null;
  if (userConfirmed) {
    updates.user_confirmed_at = now;
    userConfirmedAt = now;
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

  // 6. Nếu user vừa tick "đã CK" lần đầu → chuyển order sang WAITING_CONFIRM
  if (userConfirmed) {
    const allowed = ['WAITING_PAYMENT'];
    if (allowed.includes(order.status)) {
      await db.from('orders').update({ status: 'WAITING_CONFIRM' }).eq('id', order.id);
    }
  }

  return NextResponse.json({
    ok: true,
    billUrl,
    userConfirmedAt,
  });
}
