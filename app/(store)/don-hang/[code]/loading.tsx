export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-8 animate-pulse">
      {/* Back link skeleton */}
      <div className="mb-6 h-4 w-40 rounded bg-gold/10" />

      <div className="flex flex-col gap-8">
        {/* Header skeleton */}
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="h-10 w-72 rounded bg-gold/10" />
            <div className="mt-3 h-4 w-48 rounded bg-gold/5" />
          </div>
          <div className="flex gap-2">
            <div className="h-7 w-32 rounded-full bg-gold/10" />
            <div className="h-7 w-36 rounded-full bg-gold/10" />
          </div>
        </header>

        {/* Product card skeleton */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-col overflow-hidden border border-gold/10 bg-surface sm:flex-row">
            <div className="h-48 w-full shrink-0 bg-gold/5 sm:h-auto sm:w-48" />
            <div className="flex flex-1 flex-col justify-between p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="h-6 w-48 rounded bg-gold/10" />
                  <div className="mt-2 h-4 w-32 rounded bg-gold/5" />
                </div>
                <div className="h-6 w-24 rounded bg-gold/10" />
              </div>
              <div className="mt-4 flex gap-4">
                <div className="h-4 w-28 rounded bg-gold/5" />
                <div className="h-4 w-20 rounded bg-gold/5" />
              </div>
            </div>
          </div>
        </section>

        {/* Info grid skeleton */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="h-48 border border-gold/10 bg-surface-emerald" />
          <div className="h-48 border border-gold/10 bg-surface-emerald md:col-span-2" />
        </section>

        {/* Summary skeleton */}
        <section className="border-t-2 border-gold/30 bg-surface-emerald p-8">
          <div className="ml-auto max-w-md space-y-4">
            <div className="flex justify-between">
              <div className="h-4 w-24 rounded bg-gold/5" />
              <div className="h-4 w-32 rounded bg-gold/5" />
            </div>
            <div className="flex justify-between">
              <div className="h-4 w-32 rounded bg-gold/5" />
              <div className="h-4 w-28 rounded bg-gold/5" />
            </div>
            <div className="flex justify-between border-t border-gold/30 pt-4">
              <div className="h-6 w-28 rounded bg-gold/10" />
              <div className="h-8 w-36 rounded bg-gold/10" />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}