interface StatsBarProps {
  totalActive: number;
  newCount: number;
  byRegion: Record<string, number>;
  lastScrape: string;
  possiblyFilled: number;
}

export default function StatsBar({
  totalActive,
  newCount,
  byRegion,
  lastScrape,
  possiblyFilled,
}: StatsBarProps) {
  return (
    <div className="mb-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-3xl font-bold text-slate-900">{totalActive}</div>
          <div className="text-xs text-slate-500 uppercase tracking-wide font-medium mt-1">
            Active Matches
          </div>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white">
          <div className="text-3xl font-bold">{newCount}</div>
          <div className="text-xs uppercase tracking-wide font-medium mt-1 text-emerald-50">
            New This Scrape
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-3xl font-bold text-slate-900">
            {Object.keys(byRegion).length}
          </div>
          <div className="text-xs text-slate-500 uppercase tracking-wide font-medium mt-1">
            Regions
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-3xl font-bold text-orange-500">
            {possiblyFilled}
          </div>
          <div className="text-xs text-slate-500 uppercase tracking-wide font-medium mt-1">
            Possibly Filled
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold">
            Jobs by Region
          </div>
          {lastScrape && (
            <div className="text-xs text-slate-400">
              Last updated: {lastScrape}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(byRegion).length === 0 && (
            <span className="text-sm text-slate-400">No regions yet</span>
          )}
          {Object.entries(byRegion)
            .sort(([, a], [, b]) => b - a)
            .map(([region, count]) => (
              <span
                key={region}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-700"
              >
                {region}
                <span className="bg-white text-slate-900 px-1.5 rounded text-xs font-bold">
                  {count}
                </span>
              </span>
            ))}
        </div>
      </div>
    </div>
  );
}
