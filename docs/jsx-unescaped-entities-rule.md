# Skill: Tránh lỗi ESLint `react/no-unescaped-entities` trong JSX

## Nguyên tắc cốt lõi

Trong JSX, **không bao giờ** đặt ký tự `"` (double quote) hoặc `'` (single quote) trực tiếp trong text node. ESLint rule `react/no-unescaped-entities` sẽ báo lỗi và chặn build.

## Các ký tự cần escape

| Ký tự | Escape HTML | Unicode | Named entity |
|-------|-------------|---------|--------------|
| `"`   | `"`    | `&#34;` | `&ldquo;` / `&rdquo;` (curly quotes) |
| `'`   | `'`    | `&#39;` | `&lsquo;` / `&rsquo;` (curly quotes) |
| `>`   | `>`      | `&#62;` | — |
| `<`   | `<`      | `&#60;` | — |
| `&`   | `&`     | `&#38;` | — |

## Pattern an toàn (ưu tiên)

### 1. Dùng curly quotes (`&ldquo;` / `&rdquo;`) cho tiếng Việt

```tsx
// ❌ SAI — lỗi ESLint
<p>Bấm "Thêm message" để bắt đầu.</p>

// ✅ ĐÚNG
<p>Bấm &ldquo;Thêm message&rdquo; để bắt đầu.</p>
```

### 2. Dùng JS expression (curly braces) khi cần dynamic

```tsx
// ✅ An toàn — text nằm trong JS string, không phải JSX text node
<p>{`Bấm "Thêm message" để bắt đầu.`}</p>
```

### 3. Dùng template literal cho text dài có nhiều dấu quote

```tsx
// ✅
<p>{`Khách hàng nói: "Cảm ơn" khi nhận hàng.`}</p>
```

## Checklist trước khi commit

- [ ] Search toàn bộ file `.tsx` vừa sửa: tìm pattern `>.*["'].+["'].*<` trong JSX text
- [ ] Mọi `"` trong JSX text node → thay bằng `&ldquo;` / `&rdquo;` hoặc bọc trong `{}`
- [ ] Mọi `'` trong JSX text node → thay bằng `&lsquo;` / `&rsquo;` hoặc bọc trong `{}`
- [ ] Chạy `npm run build` để verify không còn error

## Lint command nhanh

```bash
# Tìm tất cả file có khả năng vi phạm
npx eslint . --ext .tsx,.ts --rule '{"react/no-unescaped-entities": "error"}'
```

## Lỗi thường gặp trong project này

| File | Dòng | Nguyên nhân | Fix |
|------|------|-------------|-----|
| `components/admin/settings/announcement-tab.tsx` | 127 | `"Thêm message"` trong JSX text | `&ldquo;Thêm message&rdquo;` |
| `components/admin/settings/site-info-tab.tsx` | 152 | `"Chat Zalo"` trong JSX text | `&ldquo;Chat Zalo&rdquo;` |

## Quy tắc vàng

> **Khi viết text tiếng Việt trong JSX có chứa dấu nháy, luôn dùng HTML entity (`&ldquo;` / `&rdquo;`) hoặc bọc trong `{` `}`. Không bao giờ để raw `"` hoặc `'` trong JSX text node.**