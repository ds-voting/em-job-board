"use client";

import { useState, useEffect, useMemo } from "react";
import { RejectedJob } from "@/lib/types";

export default function RejectedPage() {
  const [rejected, setRejected] = useState<RejectedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [reasonFilter, setReasonFilter] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/rejected")
      .then((res) => res.json())
      .then((data) => {
        setRejected(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const reasons = useMemo(() => {
    const reasonCounts: Record<string, number> = {};
    for (const r of rejected) {
      reasonCounts[r.rejection_reason] = (reasonCounts[r.rejection_reason] || 0) + 1;
    }
    return Object.entries(reasonCounts).sort(([, a], [, b]) => b - a);
  }, [rejected]);

  const filtered = useMemo(() => {
    let result = rejected;
    if (reasonFilter) {
      result = result.filter((r) => r.rejection_reason === reasonFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.employer.toLowerCase().includes(q) ||
          r.location.toLowerCase().includes(q)
      );
    }
    return result.slice(0, 200); // Cap at 200 for performance
  }, [rejected, reasonFilter, search]);

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="inline-block w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500 mt-3">Loading...</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Rejected Jobs
        </h1>
        <p className="text-sm text-slate-600">
          {rejected.length} jobs were filtered out. Review here to spot anything
          good that was wrongly excluded.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-3">
          Top Rejection Reasons
        </div>
        <div className="flex flex-wrap gap-2">
          {reasons.slice(0, 8).map(([reason, count]) => (
            <button
              type="button"
              key={reason}
              onClick={() =>
                setReasonFilter(reasonFilter === reason ? "" : reason)
              }
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition ${
                reasonFilter === reason
                  ? "bg-rose-500 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {reason}
              <span
                className={`px-1.5 rounded text-xs font-bold ${
                  reasonFilter === reason
                    ? "bg-white text-rose-500"
                    : "bg-white text-slate-900"
                }`}
              >
                {count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search rejected jobs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 text-sm shadow-sm"
        />
      </div>

      <div className="text-sm text-slate-500 mb-4 font-medium">
        Showing <span className="text-slate-900 font-bold">{filtered.length}</span>
        {filtered.length === 200 && " (capped at 200)"}
      </div>

      <div className="space-y-2">
        {filtered.map((job) => (
          <div
            key={job.id}
            className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-sm transition"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-slate-900 text-sm truncate">
                  {job.title}
                </h3>
                <p className="text-xs text-slate-600 truncate mt-0.5">
                  {job.employer} &middot; {job.location}
                </p>
              </div>
              <span className="shrink-0 inline-flex items-center px-2 py-1 rounded text-[11px] font-medium bg-red-50 text-red-700 border border-red-100 whitespace-nowrap">
                {job.rejection_reason}
              </span>
            </div>
            {job.source_url && (
              <a
                href={job.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-rose-600 hover:underline mt-1 inline-block"
              >
                View original →
              </a>
            )}
          </div>
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="text-center text-slate-400 py-12 bg-white rounded-xl border border-slate-200">
          No rejected jobs match your filters.
        </p>
      )}
    </>
  );
}
