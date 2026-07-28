// sentry.edge.config.ts
// Sentry initialization cho Edge runtime — chạy trong middleware.ts.
// Edge runtime nhẹ hơn Node: không có full Node API, không có replay.

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.1,
    integrations: [],
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    release: process.env.SENTRY_RELEASE,
  });
}