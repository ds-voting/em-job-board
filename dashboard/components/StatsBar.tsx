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
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
      <div className="flex flex-wrap gap-6 items-center">
        <div>
          <div className="text-2xl font-bold text-gray-900">{totalActive}</div>
          <div className="text-sm text-gray-500">Active Jobs</div>
        </div>
        {newCount > 0 && (
          <div>
            <div className="text-2xl font-bold text-green-600">{newCount}</div>
            <div className="text-sm text-gray-500">New</div>
          </div>
        )}
        {possiblyFilled > 0 && (
          <div>
            <div className="text-2xl font-bold text-orange-500">
              {possiblyFilled}
            </div>
            <div className="text-sm text-gray-500">Possibly Filled</div>
          </div>
        )}
        <div className="flex-1" />
        <div className="flex flex-wrap gap-2">
          {Object.entries(byRegion)
            .sort(([, a], [, b]) => b - a)
            .map(([region, count]) => (
              <span
                key={region}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {region}: {count}
              </span>
            ))}
        </div>
        {lastScrape && (
          <div className="text-xs text-gray-400">
            Last updated: {lastScrape}
          </div>
        )}
      </div>
    </div>
  );
}
