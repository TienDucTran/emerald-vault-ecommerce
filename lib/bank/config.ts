// Đọc thông tin ngân hàng từ env + validate. Dùng cho VietQR generation.
//
// Lưu ý: Next.js (dotenv) KHÔNG strip inline comment (# ...) trong một số
// trường hợp → giá trị env có thể lẫn comment → getBankByCode fail silently.
// Strip inline comment + trim whitespace để robust hơn.

import { getBankByCode, type BankCode } from './types';
import { isValidAccountNumber } from './vietqr';

export interface BankConfig {
  bankCode: BankCode | '';
  accountNumber: string;
  accountName: string;
  isConfigured: boolean;
}

/**
 * Strip inline comment (# ...) khỏi giá trị env + trim whitespace.
 * Ví dụ: "EIB       # hoặc MB, TCB..." → "EIB"
 */
function cleanEnvValue(raw: string): string {
  // Chỉ strip comment nếu # đứng sau khoảng trắng (tránh cắt giá trị hợp lệ
  // có chứa # — vd URL fragment). Match pattern: whitespace + #
  const commentIdx = raw.search(/\s#/);
  const value = commentIdx >= 0 ? raw.slice(0, commentIdx) : raw;
  return value.trim();
}

export function getBankConfig(): BankConfig {
  const bankCode = cleanEnvValue(process.env.BANK_CODE ?? '') as BankCode | '';
  const accountNumber = cleanEnvValue(process.env.BANK_ACCOUNT_NUMBER ?? '');
  const accountName = cleanEnvValue(process.env.BANK_ACCOUNT_NAME ?? '');

  const bank = bankCode ? getBankByCode(bankCode) : undefined;
  const validAccount = isValidAccountNumber(accountNumber);
  const validName = accountName.length >= 3;

  return {
    bankCode,
    accountNumber,
    accountName,
    isConfigured: !!bank && validAccount && validName,
  };
}
