"use client";

import { useState, useEffect, useMemo } from "react";
import { RejectedJob } from "@/lib/types";

export default function RejectedPage() {
  const [rejected, setRejected] = useState<RejectedJob[]>([]);
  const [reasonFilter, setReasonFilter] = useState("");

  useEffect(() => {
    fetch("/api/rejected")
      .then((res) => res.json())
      .then(setRejected)
      .catch(console.error);
  }, []);

  const reasons = useMemo(
    () => [...new Set(rejected.map((r) => r.rejection_reason))].sort(),
    [rejected]
  );

  const filtered = useMemo(() => {
    if (!reasonFilter) return rejected;
    return rejected.filter((r) => r.rejection_reason === reasonFilter);
  }, [rejected, reasonFilter]);

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Rejected Jobs</h1>
      <p className="text-sm text-gray-500 mb-4">
        These jobs were found but filtered out. Review them to make sure nothing
        good is being wrongly excluded.
      </p>

      <select
        value={reasonFilter}
        onChange={(e) => setReasonFilter(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white mb-4"
      >
        <option value="">All Reasons ({rejected.length})</option>
        {reasons.map((r) => (
          <option key={r} value={r}>
            {r} ({rejected.filter((j) => j.rejection_reason === r).length})
          </option>
        ))}
      </select>

      <div className="space-y-3">
        {filtered.map((job) => (
          <div
            key={job.id}
            className="bg-white rounded-lg border border-gray-200 p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-gray-900">{job.title}</h3>
                <p className="text-sm text-gray-600">{job.employer}</p>
                <p className="text-sm text-gray-500">{job.location}</p>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 whitespace-nowrap">
                {job.rejection_reason}
              </span>
            </div>
            {job.source_url && (
              <a
                href={job.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline mt-2 inline-block"
              >
                View original posting
              </a>
            )}
          </div>
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="text-center text-gray-400 py-12">No rejected jobs.</p>
      )}
    </>
  );
}
