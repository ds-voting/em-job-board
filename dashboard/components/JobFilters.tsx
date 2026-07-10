"use client";

interface JobFiltersProps {
  regions: string[];
  selectedRegion: string;
  onRegionChange: (region: string) => void;
  selectedConfidence: string;
  onConfidenceChange: (confidence: string) => void;
  selectedInstitution: string;
  onInstitutionChange: (institution: string) => void;
  showFilled: boolean;
  onShowFilledChange: (show: boolean) => void;
}

const SELECT_CLASS =
  "px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-signal/30 focus:border-signal cursor-pointer";

export default function JobFilters({
  regions,
  selectedRegion,
  onRegionChange,
  selectedConfidence,
  onConfidenceChange,
  selectedInstitution,
  onInstitutionChange,
  showFilled,
  onShowFilledChange,
}: JobFiltersProps) {
  const hasFilters = selectedRegion || selectedConfidence || selectedInstitution;

  const clearAll = () => {
    onRegionChange("");
    onConfidenceChange("");
    onInstitutionChange("");
  };

  return (
    <div className="flex flex-wrap gap-2 items-center mb-4">
      <select
        value={selectedRegion}
        onChange={(e) => onRegionChange(e.target.value)}
        className={SELECT_CLASS}
      >
        <option value="">All Regions</option>
        {regions.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>

      <select
        value={selectedConfidence}
        onChange={(e) => onConfidenceChange(e.target.value)}
        className={SELECT_CLASS}
      >
        <option value="">All Confidence</option>
        <option value="High">High Confidence</option>
        <option value="Medium">Medium Confidence</option>
        <option value="Low">Low Confidence</option>
      </select>

      <select
        value={selectedInstitution}
        onChange={(e) => onInstitutionChange(e.target.value)}
        className={SELECT_CLASS}
      >
        <option value="">All Institutions</option>
        <option value="Academic Medical Center">Academic Medical Center</option>
        <option value="Trauma Level I">Trauma Level I</option>
        <option value="Trauma Level II">Trauma Level II</option>
        <option value="Trauma Level III">Trauma Level III</option>
        <option value="Private Hospital Group">Private Hospital Group</option>
        <option value="Community Hospital">Community Hospital</option>
      </select>

      {hasFilters && (
        <button
          type="button"
          onClick={clearAll}
          className="px-3 py-2 text-sm text-slate-600 hover:text-signal font-medium transition-colors"
        >
          Clear filters
        </button>
      )}

      <label className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 cursor-pointer select-none ml-auto">
        <input
          type="checkbox"
          checked={showFilled}
          onChange={(e) => onShowFilledChange(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-signal focus:ring-2 focus:ring-signal/30"
        />
        Show possibly filled
      </label>
    </div>
  );
}
