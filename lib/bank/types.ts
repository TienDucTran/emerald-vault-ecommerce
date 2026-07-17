// 38 ngân hàng hỗ trợ VietQR + VietQR.io API bank code
// Theo https://vietqr.io/api-documentation
export const BANK_LIST = [
  { code: 'VCB', name: 'Vietcombank', bin: '970436', shortName: 'VCB' },
  { code: 'MB', name: 'MBBank', bin: '970422', shortName: 'MB' },
  { code: 'TCB', name: 'Techcombank', bin: '970407', shortName: 'Techcombank' },
  { code: 'TPB', name: 'TPBank', bin: '970423', shortName: 'TPBank' },
  { code: 'BIDV', name: 'BIDV', bin: '970418', shortName: 'BIDV' },
  { code: 'ACB', name: 'ACB', bin: '970416', shortName: 'ACB' },
  { code: 'VPB', name: 'VPBank', bin: '970432', shortName: 'VPBank' },
  { code: 'STB', name: 'Sacombank', bin: '970403', shortName: 'Sacombank' },
  { code: 'HDB', name: 'HDBank', bin: '970437', shortName: 'HDBank' },
  { code: 'SHB', name: 'SHB', bin: '970443', shortName: 'SHB' },
  { code: 'VIB', name: 'VIB', bin: '970441', shortName: 'VIB' },
  { code: 'EIB', name: 'Eximbank', bin: '970431', shortName: 'Eximbank' },
  { code: 'MSB', name: 'MSB', bin: '970426', shortName: 'MSB' },
  { code: 'CAKE', name: 'CAKE by VPBank', bin: '546034', shortName: 'CAKE' },
  { code: 'UBANK', name: 'Ubank by VPBank', bin: '546035', shortName: 'Ubank' },
  { code: 'TIMO', name: 'Timo by BVBank', bin: '963388', shortName: 'Timo' },
  { code: 'VTLM', name: 'Viettel Money', bin: '971005', shortName: 'ViettelMoney' },
  { code: 'VNPTM', name: 'VNPT Money', bin: '971011', shortName: 'VNPTMoney' },
  { code: 'MOMO', name: 'MoMo', bin: '971025', shortName: 'MoMo' },
] as const;

export type BankCode = (typeof BANK_LIST)[number]['code'];

/** Helper: tra cứu ngân hàng theo mã code (VCB, MB, ...) */
export function getBankByCode(code: string) {
  return BANK_LIST.find((b) => b.code === code);
}

/** Helper: tra cứu ngân hàng theo BIN (970436, ...) */
export function getBankByBin(bin: string) {
  return BANK_LIST.find((b) => b.bin === bin);
}
