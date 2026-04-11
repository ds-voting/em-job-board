import { getJobById } from "@/lib/jobs";
import { getConfidenceColor, getPriorityColor } from "@/lib/utils";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = getJobById(id);

  if (!job) {
    notFound();
  }

  const hasSalary = job.salary && job.salary !== "Not listed";

  return (
    <>
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-rose-600 font-medium mb-4 group"
      >
        <svg
          className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to all jobs
      </Link>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-50 to-white border-b border-slate-200 p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {job.is_new && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-emerald-500 text-white">
                    New
                  </span>
                )}
                {job.status === "possibly_filled" && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-orange-100 text-orange-700">
                    Possibly Filled
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                {job.title}
              </h1>
              <p className="text-lg text-slate-600 mt-1">{job.employer}</p>
            </div>
            <span
              className={`shrink-0 inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold ${getConfidenceColor(job.match_confidence)}`}
            >
              {job.match_confidence} Match
            </span>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${getPriorityColor(job.location_priority)}`}
            >
              📍 {job.location}
              {job.location_region && job.location_region !== "Unknown" && (
                <span className="opacity-70">({job.location_region})</span>
              )}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${
                hasSalary
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              💰 {job.salary}
            </span>
            {job.institution_type && job.institution_type !== "Unknown" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-violet-50 text-violet-700 border border-violet-100">
                🏥 {job.institution_type}
              </span>
            )}
            {job.schedule_type && job.schedule_type !== "Unclear" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-50 text-blue-700 border border-blue-100">
                ⏱ {job.schedule_type}
              </span>
            )}
          </div>

          {job.red_flags && job.red_flags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {job.red_flags.map((flag) => (
                <span
                  key={flag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 text-red-700 border border-red-200"
                >
                  ⚠ {flag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Content sections */}
        <div className="p-6 space-y-6">
          {job.analysis_notes && (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                AI Analysis
              </h2>
              <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-lg p-4 border border-slate-100">
                {job.analysis_notes}
              </p>
            </div>
          )}

          {job.full_description && (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                Full Description
              </h2>
              <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                {job.full_description}
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
            <a
              href={job.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 font-semibold text-sm shadow-sm transition"
            >
              View Original Posting
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
            <span className="text-xs text-slate-400">
              {job.source_name} &middot; Found {job.date_found} &middot; Last seen {job.date_last_seen}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
