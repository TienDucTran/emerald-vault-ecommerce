// instrumentation.ts
// Next.js 14 native hook — Next.js tự load file này lúc server startup.
// Đây là cách được Next.js khuyến nghị cho App Router để init Sentry runtime
// configs (thay vì wrap next.config — bị conflict với ESM `.mjs`).
//
// Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
//
// Vì các file sentry.*.config.ts đã guard bằng `if (SENTRY_DSN)` nên nếu env
// chưa có (local dev trước khi setup Sentry), import sẽ no-op — không fail.

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}