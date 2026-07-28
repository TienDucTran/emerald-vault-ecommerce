// Phone normalization helper — shared between server (API routes) và client (page).
// Quy ước canonical: loại bỏ mọi ký tự không phải số, đổi prefix "84" (11 số) về "0xxx".
// Dùng để so sánh lỏng lẻo giữa phone từ URL/form và phone lưu trong DB.

/**
 * Normalize phone về dạng chỉ còn chữ số, quy về prefix 0xxx để so sánh.
 * - Loại bỏ mọi ký tự không phải số (khoảng trắng, dấu gạch, +, ngoặc).
 * - Nếu bắt đầu bằng "84" và đủ 11 số (VD: 84924825726) thì đổi thành 0xxx.
 * - Trả về chuỗi digits thuần để so sánh lỏng lẻo giữa DB và URL.
 *
 * Examples:
 *   normalizePhone('+84924825726')   -> '0924825726'
 *   normalizePhone('84924825726')    -> '0924825726'
 *   normalizePhone('0924825726')     -> '0924825726'
 *   normalizePhone('+84 924 825 726')-> '0924825726'
 *   normalizePhone('(924) 825-726')  -> '924825726'
 *   normalizePhone('')               -> ''
 */
export function normalizePhone(input: string | null | undefined): string {
  if (!input) return '';
  const digits = input.replace(/\D/g, '');
  if (digits.startsWith('84') && digits.length === 11) {
    return '0' + digits.slice(2);
  }
  return digits;
}
