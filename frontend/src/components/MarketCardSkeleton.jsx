// A single placeholder card matching MarketCard's shape, shown while markets load.
export default function MarketCardSkeleton() {
  return (
    <div className="market-card bg-slate-900/50  border border-slate-800 rounded-xl p-4 flex flex-col gap-2.5 animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-lg bg-slate-800 flex-shrink-0" />
          <div className="flex-1 space-y-1.5 pt-0.5">
            <div className="h-3 bg-slate-800 rounded w-4/5" />
            <div className="h-3 bg-slate-800 rounded w-1/2" />
          </div>
        </div>
        <div className="w-10 h-6 bg-slate-800 rounded flex-shrink-0" />
      </div>
      <div className="h-11 bg-slate-800/60 rounded" />
      <div className="flex gap-2">
        <div className="flex-1 h-8 bg-slate-800 rounded-lg" />
        <div className="flex-1 h-8 bg-slate-800 rounded-lg" />
      </div>
      <div className="flex items-center justify-between pt-0.5">
        <div className="h-3 w-16 bg-slate-800 rounded" />
        <div className="h-3 w-10 bg-slate-800 rounded" />
      </div>
    </div>
  );
}

export function MarketGridSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-auto">
      {Array.from({ length: count }, (_, i) => <MarketCardSkeleton key={i} />)}
    </div>
  );
}
