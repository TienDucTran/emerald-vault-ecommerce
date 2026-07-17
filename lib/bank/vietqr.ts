// Generate VietQR image URL theo chuẩn Napas EMVCo + dùng API vietqr.io (miễn phí, không cần API key).
// Docs: https://vietqr.io/api-documentation

import { getBankByCode, type BankCode } from './types';

export interface VietQRParams {
  bankCode: BankCode;
  accountNumber: string;
  accountName: string;
  amount: number;
  addInfo: string;
  template?: 'compact' | 'qr_only' | 'print';
}

/**
 * Generate VietQR image URL từ vietqr.io API (FREE, không cần API key).
 * Format: https://img.vietqr.io/image/{template}-{bankBin}-{accountNumber}.png?amount=...&addInfo=...&accountName=...
 */
export function generateVietQRUrl(params: VietQRParams): string {
  const bank = getBankByCode(params.bankCode);
  if (!bank) {
    throw new Error(`Unknown bank code: ${params.bankCode}`);
  }

  const baseUrl = 'https://img.vietqr.io/image';
  const template = params.template ?? 'compact';
  const accountName = params.accountName.toUpperCase();

  const search = new URLSearchParams({
    amount: String(params.amount),
    addInfo: params.addInfo,
    accountName,
  });

  return `${baseUrl}/${template}-${bank.bin}-${params.accountNumber}.png?${search.toString()}`;
}

/**
 * Format nội dung CK chuẩn — loại bỏ ký tự đặc biệt, giới hạn 50 ký tự ASCII
 * (VietQR cho phép tối đa 50 ký tự ASCII cho addInfo).
 */
export function formatTransferContent(orderCode: string): string {
  return orderCode.replace(/[^A-Za-z0-9-]/g, '').slice(0, 50);
}

/** Validate số tài khoản Việt Nam (basic: chỉ chứa số, độ dài 6-20). */
export function isValidAccountNumber(account: string): boolean {
  return /^\d{6,20}$/.test(account);
}
