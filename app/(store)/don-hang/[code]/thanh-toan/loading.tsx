export default function Loading() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 animate-pulse">
      {/* Title */}
      <div className="mb-6 text-center">
        <div className="mx-auto h-8 w-56 rounded bg-gold/10" />
        <div className="mx-auto mt-3 h-4 w-40 rounded bg-gold/5" />
      </div>

      {/* QR card skeleton */}
      <div className="rounded-lg border-2 border-gold/30 bg-card p-6">
        <div className="flex justify-center">
          <div className="h-64 w-64 rounded-md bg-gold/10" />
        </div>
        <div className="mt-4 mx-auto h-4 w-32 rounded bg-gold/5" />
        <div className="mt-4 mx-auto h-4 w-28 rounded bg-gold/5" />
      </div>

      {/* Info rows skeleton */}
      <div className="mt-6 grid grid-cols-1 gap-3">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded-md border border-gold/20 bg-surface px-4 py-3"
          >
            <div className="flex-1">
              <div className="h-3 w-24 rounded bg-gold/5" />
              <div className="mt-1.5 h-5 w-40 rounded bg-gold/10" />
            </div>
            <div className="h-7 w-7 rounded border border-gold/30 bg-gold/5" />
          </div>
        ))}
      </div>

      {/* Action buttons skeleton */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="flex-1 h-12 rounded-md bg-gold/10" />
        <div className="flex-1 h-12 rounded-md bg-gold/5 border border-gold/20" />
      </div>

      {/* Help text skeleton */}
      <div className="mt-4 mx-auto h-4 w-72 rounded bg-gold/5" />
      <div className="mt-2 mx-auto h-4 w-56 rounded bg-gold/5" />
    </div>
  );
}