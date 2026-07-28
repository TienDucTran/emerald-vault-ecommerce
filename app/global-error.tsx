'use client';

// app/global-error.tsx
// Catch-all UI khi root layout crash. Next.js yêu cầu file này render cả <html>
// + <body> vì root layout không còn đáng tin cậy nữa.
// Docs: https://nextjs.org/docs/app/building-your-application/routing/error-handling#handling-errors-in-root-layouts

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.ReactElement {
  return (
    <html lang="vi">
      <body
        style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
          margin: 0,
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0a',
          color: '#e5e5e5',
        }}
      >
        <div style={{ textAlign: 'center', padding: '2rem', maxWidth: '32rem' }}>
          <h1 style={{ fontSize: '1.875rem', marginBottom: '1rem' }}>
            Đã có lỗi xảy ra
          </h1>
          <p style={{ color: '#a3a3a3', marginBottom: '1.5rem' }}>
            Hệ thống gặp sự cố không mong muốn. Vui lòng thử lại sau.
          </p>
          {error.digest && (
            <p style={{ fontSize: '0.75rem', color: '#525252', marginBottom: '1.5rem' }}>
              Mã lỗi: {error.digest}
            </p>
          )}
          <button
            onClick={() => reset()}
            style={{
              padding: '0.625rem 1.25rem',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Thử lại
          </button>
        </div>
      </body>
    </html>
  );
}