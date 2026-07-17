// Đọc thông tin ngân hàng từ env + validate. Dùng cho VietQR generation.

import { getBankByCode, type BankCode } from './types';
import { isValidAccountNumber } from './vietqr';

export interface BankConfig {
  bankCode: BankCode | '';
  accountNumber: string;
  accountName: string;
  isConfigured: boolean;
}

export function getBankConfig(): BankConfig {
  const bankCode = (process.env.BANK_CODE ?? '') as BankCode | '';
  const accountNumber = process.env.BANK_ACCOUNT_NUMBER ?? '';
  const accountName = process.env.BANK_ACCOUNT_NAME ?? '';

  const bank = bankCode ? getBankByCode(bankCode) : undefined;
  const validAccount = isValidAccountNumber(accountNumber);
  const validName = accountName.trim().length >= 3;

  return {
    bankCode,
    accountNumber,
    accountName,
    isConfigured: !!bank && validAccount && validName,
  };
}
