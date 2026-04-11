"use client";

import { useState, useEffect, useMemo } from "react";
import StatsBar from "@/components/StatsBar";
import JobCard from "@/components/JobCard";
import SearchBar from "@/components/SearchBar";
import JobFilters from "@/components/JobFilters";
import { Job } from "@/lib/types";

export default function HomePage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("");
  const [confidence, setConfidence] = useState("");
  const [institution, setInstitution] = useState("");

  useEffect(() => {
    fetch("/api/jobs")
      .then((res) => res.json())
      .then((data) => {
        setJobs(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const activeJobs = useMemo(
    () => jobs.filter((j) => j.status === "active"),
    [jobs]
  );

  const regions = useMemo(
    () =>
      [...new Set(activeJobs.map((j) => j.location_region).filter(Boolean))]
        .sort(),
    [activeJobs]
  );

  const filtered = useMemo(() => {
    let result = activeJobs;

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

    // Sort: New first within confidence tiers, then by location priority
    return [...result].sort((a, b) => {
      const confOrder: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
      const confDiff =
        (confOrder[a.match_confidence] ?? 3) -
        (confOrder[b.match_confidence] ?? 3);
      if (confDiff !== 0) return confDiff;

      // New jobs bubble up within tier
      if (a.is_new !== b.is_new) return a.is_new ? -1 : 1;

      const priDiff = a.location_priority - b.location_priority;
      if (priDiff !== 0) return priDiff;
      return b.date_found.localeCompare(a.date_found);
    });
  }, [activeJobs, search, region, confidence, institution]);

  const stats = useMemo(() => {
    const byRegion: Record<string, number> = {};
    for (const job of activeJobs) {
      const r = job.location_region || "Unknown";
      byRegion[r] = (byRegion[r] || 0) + 1;
    }
    return {
      totalActive: activeJobs.length,
      newCount: activeJobs.filter((j) => j.is_new).length,
      byRegion,
      lastScrape: jobs.reduce(
        (l, j) => (j.date_last_seen > l ? j.date_last_seen : l),
        ""
      ),
      possiblyFilled: jobs.filter((j) => j.status === "possibly_filled").length,
    };
  }, [jobs, activeJobs]);

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="inline-block w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500 mt-3">Loading jobs...</p>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
        <div className="text-5xl mb-3">🔍</div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          No jobs found yet
        </h2>
        <p className="text-sm text-slate-500">
          Run the scraper to populate job listings.
        </p>
      </div>
    );
  }

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

      <div className="text-sm text-slate-500 mb-4 font-medium">
        Showing <span className="text-slate-900 font-bold">{filtered.length}</span> of{" "}
        <span className="text-slate-900 font-bold">{activeJobs.length}</span> active jobs
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <p className="text-slate-500">
            No jobs match your current filters.
          </p>
        </div>
      )}
    </>
  );
}
