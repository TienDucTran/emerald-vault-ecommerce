// sentry.server.config.ts
// Sentry initialization for Node.js runtime (Server Components, Route Handlers,
// Server Actions, API routes, background jobs).
//
// Loaded via instrumentation.ts when NEXT_RUNTIME === 'nodejs'.

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    tracesSampleRate: 0.1,

    // Server-side không cần Replay (replay là browser-only feature).
    integrations: [],

    // Redact sensitive fields từ events + breadcrumbs trước khi gửi Sentry.
    // Danh sách field phải match với payment / auth / customer data shape.
    beforeSend(event, hint) {
      // Suppress ở dev: console.error là đủ, không cần gửi Sentry.
      if (process.env.NODE_ENV === 'development') {
        const error = hint?.originalException;
        if (error instanceof Error) {
          console.debug('[sentry:server] suppressed (dev):', error.message);
        }
        return null;
      }

      // Redact extras (custom context).
      if (event.extra) {
        event.extra = redactObject(event.extra);
      }
      // Redact contexts (user, payment, etc.).
      if (event.contexts) {
        event.contexts = redactObject(event.contexts);
      }
      // Redact request data (cookies, headers, body).
      if (event.request) {
        event.request = redactObject(event.request);
        if (event.request.cookies) {
          event.request.cookies = redactKeys(event.request.cookies);
        }
        if (event.request.headers) {
          event.request.headers = redactKeys(event.request.headers);
        }
      }
      // Redact user data.
      if (event.user) {
        event.user = redactObject(event.user);
      }
      return event;
    },

    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.data) {
        return { ...breadcrumb, data: redactObject(breadcrumb.data) };
      }
      return breadcrumb;
    },

    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    release: process.env.SENTRY_RELEASE,
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const REDACT_KEYS = [
  'phone',
  'email',
  'customer_phone',
  'customer_email',
  'password',
  'token',
  'apiKey',
  'api_key',
  'cookie',
  'cookies',
  'authorization',
  'auth',
  'access_token',
  'refresh_token',
];

/**
 * Deep-walk object, thay mọi value của key nằm trong REDACT_KEYS bằng
 * '[redacted]'. Không mutate input.
 */
function redactObject<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map((v) => redactObject(v)) as unknown as T;
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (REDACT_KEYS.includes(k)) {
      out[k] = '[redacted]';
    } else if (typeof v === 'object' && v !== null) {
      out[k] = redactObject(v);
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

function redactKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (REDACT_KEYS.includes(k.toLowerCase())) {
      out[k] = '[redacted]';
    } else {
      out[k] = v;
    }
  }
  return out;
}