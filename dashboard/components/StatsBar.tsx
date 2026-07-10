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
  const stats = [
    { label: "Active Matches", value: totalActive, accent: false },
    { label: "New This Scrape", value: newCount, accent: true },
    { label: "Regions", value: Object.keys(byRegion).length, accent: false },
    { label: "Possibly Filled", value: possiblyFilled, accent: false },
  ];

  return (
    <div className="mb-6">
      <div className="bg-white rounded-lg border border-slate-200 grid grid-cols-2 sm:grid-cols-4 mb-4">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={`p-4 ${i > 0 ? "border-t sm:border-t-0 sm:border-l border-slate-200" : ""}`}
          >
            <div
              className={`font-display text-3xl font-semibold tabular-nums ${
                s.accent ? "text-vital" : "text-ink"
              }`}
            >
              {s.value}
            </div>
            <div className="text-xs text-slate-500 uppercase tracking-wide font-medium mt-1">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold">
            Jobs by Region
          </div>
          {lastScrape && (
            <div className="text-xs text-slate-500 tabular-nums">
              Last updated: {lastScrape}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(byRegion).length === 0 && (
            <span className="text-sm text-slate-500">No regions yet</span>
          )}
          {Object.entries(byRegion)
            .sort(([, a], [, b]) => b - a)
            .map(([region, count]) => (
              <span
                key={region}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-700"
              >
                {region}
                <span className="bg-white text-ink px-1.5 rounded text-xs font-bold tabular-nums">
                  {count}
                </span>
              </span>
            ))}
        </div>
      </div>
    </div>
  );
}
