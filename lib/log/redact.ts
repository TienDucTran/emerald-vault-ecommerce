// lib/log/redact.ts
// Redact PII patterns khỏi log messages để tránh leak SĐT/email ra console.
// Áp dụng trước khi console.error/console.warn trong route handlers + tool execute.
const PHONE_RE = /(\+?84|0)\d{9,10}/g;
const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]+/g;

export function redactPII(input: string): string {
  if (!input) return '';
  return input
    .replace(PHONE_RE, '[REDACTED_PHONE]')
    .replace(EMAIL_RE, '[REDACTED_EMAIL]');
}
