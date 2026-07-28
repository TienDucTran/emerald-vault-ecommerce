// sentry.client.config.ts
// Sentry initialization cho browser (Client Components).
//
// Chiến lược sampling cho MVP:
//  - tracesSampleRate: 10% — đủ để theo dõi perf, không tốn quota.
//  - replaysOnErrorSampleRate: 100% — capture full session khi error xảy ra
//    (rất có giá trị debug cho UI bug / chatbot streaming issue).
//  - replaysSessionSampleRate: 0% — không capture session bình thường, tiết
//    kiệm bandwidth + storage.
//  - Dev: ignore all errors (chỉ console.log).

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.0,
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    // Suppress ở local dev — không gửi events khi dev đang debug.
    beforeSend(event, hint) {
      if (process.env.NODE_ENV === 'development') {
        const error = hint?.originalException;
        if (error instanceof Error) {
          console.debug('[sentry:client] suppressed (dev):', error.message);
        }
        return null;
      }
      return event;
    },
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
  });
}