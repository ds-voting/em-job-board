"use client";

interface JobFiltersProps {
  regions: string[];
  selectedRegion: string;
  onRegionChange: (region: string) => void;
  selectedConfidence: string;
  onConfidenceChange: (confidence: string) => void;
  selectedInstitution: string;
  onInstitutionChange: (institution: string) => void;
}

export default function JobFilters({
  regions,
  selectedRegion,
  onRegionChange,
  selectedConfidence,
  onConfidenceChange,
  selectedInstitution,
  onInstitutionChange,
}: JobFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3 mb-4">
      <select
        value={selectedRegion}
        onChange={(e) => onRegionChange(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
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
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
      >
        <option value="">All Confidence</option>
        <option value="High">High</option>
        <option value="Medium">Medium</option>
        <option value="Low">Low</option>
      </select>

      <select
        value={selectedInstitution}
        onChange={(e) => onInstitutionChange(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
      >
        <option value="">All Institutions</option>
        <option value="Academic Medical Center">Academic Medical Center</option>
        <option value="Trauma Level I">Trauma Level I</option>
        <option value="Trauma Level II">Trauma Level II</option>
        <option value="Trauma Level III">Trauma Level III</option>
        <option value="Private Hospital Group">Private Hospital Group</option>
        <option value="Community Hospital">Community Hospital</option>
      </select>
    </div>
  );
}
