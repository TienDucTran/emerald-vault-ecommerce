export default function Loading() {
  return (
    <div className="relative flex flex-col gap-8 overflow-hidden animate-pulse">
      {/* Header skeleton */}
      <header className="mb-12 flex flex-col items-start gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="h-10 w-56 rounded bg-gold/10" />
          <div className="mt-3 h-4 w-44 rounded bg-gold/5" />
        </div>
      </header>

      {/* Filter + sort bar skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-9 w-24 rounded bg-gold/10" />
          ))}
        </div>
        <div className="h-9 w-36 rounded-md border border-gold/20 bg-surface" />
      </div>

      {/* Order cards skeleton */}
      <div className="flex flex-col gap-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="flex flex-col overflow-hidden rounded-md border border-gold/10 bg-surface-emerald/40 p-4 sm:p-5 md:flex-row md:gap-5"
          >
            {/* Status badge skeleton */}
            <div className="absolute right-0 top-0 h-7 w-32 rounded-bl bg-gold/10" />
            {/* Image skeleton */}
            <div className="h-32 w-full shrink-0 rounded bg-gold/5 sm:h-36 sm:w-36 md:w-40" />
            {/* Content skeleton */}
            <div className="flex flex-1 flex-col justify-between gap-3 pt-3 md:py-1">
              <div>
                <div className="h-3 w-20 rounded bg-gold/5" />
                <div className="mt-2 h-5 w-48 rounded bg-gold/10" />
                <div className="mt-2 h-4 w-64 rounded bg-gold/5" />
              </div>
              <div className="flex items-center gap-4 border-t border-gold/10 pt-3">
                <div className="h-4 w-20 rounded bg-gold/5" />
                <div className="h-4 w-24 rounded bg-gold/5" />
              </div>
            </div>
            {/* Button skeleton */}
            <div className="mt-3 h-9 w-28 rounded bg-gold/10 md:mt-0 md:self-end" />
          </div>
        ))}
      </div>
    </div>
  );
}