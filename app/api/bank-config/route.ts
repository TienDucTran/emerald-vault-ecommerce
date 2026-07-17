// GET /api/bank-config
// Trả về thông tin ngân hàng đang dùng để hiển thị (public — đã hiện trên QR rồi).
// Dùng cho client khi cần check isConfigured mà không muốn truyền prop từ server.

import { NextResponse } from 'next/server';
import { getBankConfig } from '@/lib/bank/config';
import { getBankByCode } from '@/lib/bank/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const cfg = getBankConfig();
  const bank = cfg.bankCode ? getBankByCode(cfg.bankCode) : null;

  return NextResponse.json({
    isConfigured: cfg.isConfigured,
    bankCode: cfg.bankCode,
    accountNumber: cfg.accountNumber,
    accountName: cfg.accountName,
    bankName: bank?.name ?? null,
  });
}
