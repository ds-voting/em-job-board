"use client";

import { useState, useEffect, useMemo } from "react";
import StatsBar from "@/components/StatsBar";
import JobCard from "@/components/JobCard";
import SearchBar from "@/components/SearchBar";
import JobFilters from "@/components/JobFilters";
import { Job } from "@/lib/types";

export default function HomePage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("");
  const [confidence, setConfidence] = useState("");
  const [institution, setInstitution] = useState("");

  useEffect(() => {
    fetch("/api/jobs")
      .then((res) => res.json())
      .then(setJobs)
      .catch(console.error);
  }, []);

  const regions = useMemo(
    () => [...new Set(jobs.map((j) => j.location_region).filter(Boolean))].sort(),
    [jobs]
  );

  const filtered = useMemo(() => {
    let result = jobs;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.employer.toLowerCase().includes(q) ||
          j.location.toLowerCase().includes(q)
      );
    }
    if (region) result = result.filter((j) => j.location_region === region);
    if (confidence)
      result = result.filter((j) => j.match_confidence === confidence);
    if (institution)
      result = result.filter((j) => j.institution_type === institution);

    // Sort: High confidence first, then by location priority, then by date
    return result.sort((a, b) => {
      const confOrder: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
      const confDiff =
        (confOrder[a.match_confidence] ?? 3) -
        (confOrder[b.match_confidence] ?? 3);
      if (confDiff !== 0) return confDiff;
      const priDiff = a.location_priority - b.location_priority;
      if (priDiff !== 0) return priDiff;
      return b.date_found.localeCompare(a.date_found);
    });
  }, [jobs, search, region, confidence, institution]);

  const stats = useMemo(() => {
    const active = jobs.filter((j) => j.status === "active");
    const byRegion: Record<string, number> = {};
    for (const job of active) {
      const r = job.location_region || "Unknown";
      byRegion[r] = (byRegion[r] || 0) + 1;
    }
    return {
      totalActive: active.length,
      newCount: active.filter((j) => j.is_new).length,
      byRegion,
      lastScrape: jobs.reduce(
        (l, j) => (j.date_last_seen > l ? j.date_last_seen : l),
        ""
      ),
      possiblyFilled: jobs.filter((j) => j.status === "possibly_filled")
        .length,
    };
  }, [jobs]);

  return (
    <>
      <StatsBar {...stats} />
      <div className="mb-4">
        <SearchBar value={search} onChange={setSearch} />
      </div>
      <JobFilters
        regions={regions}
        selectedRegion={region}
        onRegionChange={setRegion}
        selectedConfidence={confidence}
        onConfidenceChange={setConfidence}
        selectedInstitution={institution}
        onInstitutionChange={setInstitution}
      />
      <div className="text-sm text-gray-500 mb-3">
        Showing {filtered.length} of {jobs.length} jobs
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>
      {filtered.length === 0 && jobs.length > 0 && (
        <p className="text-center text-gray-400 py-12">
          No jobs match your current filters.
        </p>
      )}
      {jobs.length === 0 && (
        <p className="text-center text-gray-400 py-12">
          No jobs yet. Run the scraper to populate data.
        </p>
      )}
    </>
  );
}
