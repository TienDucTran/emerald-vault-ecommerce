// Shim này tồn tại để tương thích ngược với các import cũ từ
// `@/lib/modal/confirm-store` mà TS/Next resolve sang `.tsx` trước `.ts`.
//
// QUAN TRỌNG: PHẢI dùng extension `.ts` rõ ràng trong relative import
// (`from './confirm-store.ts'`), KHÔNG được bỏ trống extension
// (`from './confirm-store'`), nếu không sẽ tạo self-import cycle do
// TS resolution ưu tiên `.tsx` trước `.ts` trong cùng folder, gây ra:
//   TypeError: useConfirmDialogStore is not a function
export { useConfirmDialogStore } from './confirm-store.ts';
export type { ConfirmOptions, ConfirmVariant, ConfirmIcon } from './confirm-store.ts';
