import { getJobById } from "@/lib/jobs";
import { NEUTRAL_TAG, getConfidenceColor } from "@/lib/utils";
import { notFound } from "next/navigation";
import Link from "next/link";

function PinIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function CoinIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 7.234 6 8.027 6 9c0 .973.602 1.766 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.973 14 12c0-.973-.602-1.766-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V6z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function HospitalIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path d="M3 3a1 1 0 011-1h4a1 1 0 011 1v2h2V3a1 1 0 011-1h4a1 1 0 011 1v14a1 1 0 01-1 1h-4a1 1 0 01-1-1v-2H9v2a1 1 0 01-1 1H4a1 1 0 01-1-1V3zm7 6H8v2h2v2h2v-2h2V9h-2V7h-2v2z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l6.28 11.18c.75 1.334-.213 2.987-1.742 2.987H3.72c-1.53 0-2.493-1.653-1.743-2.987l6.28-11.18zM11 14a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V7a1 1 0 00-1-1z"
        clipRule="evenodd"
      />
    </svg>
  );
}

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
        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-signal font-medium mb-4 group"
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

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="border-b border-slate-200 p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {job.is_new && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-ink text-white">
                    New
                  </span>
                )}
                {job.status === "possibly_filled" && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-slate-100 text-slate-500">
                    Possibly Filled
                  </span>
                )}
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink">
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
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${NEUTRAL_TAG}`}>
              <PinIcon />
              {job.location}
              {job.location_region && job.location_region !== "Unknown" && (
                <span className="opacity-70">({job.location_region})</span>
              )}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium tabular-nums ${
                hasSalary ? NEUTRAL_TAG : "text-slate-500 italic"
              }`}
            >
              <CoinIcon />
              {job.salary}
            </span>
            {job.institution_type && job.institution_type !== "Unknown" && (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${NEUTRAL_TAG}`}>
                <HospitalIcon />
                {job.institution_type}
              </span>
            )}
            {job.schedule_type && job.schedule_type !== "Unclear" && (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${NEUTRAL_TAG}`}>
                <ClockIcon />
                {job.schedule_type}
              </span>
            )}
          </div>

          {job.red_flags && job.red_flags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {job.red_flags.map((flag) => (
                <span
                  key={flag}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-caution-50 text-caution border border-caution/20"
                >
                  <WarningIcon />
                  {flag}
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
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-signal text-white rounded-lg hover:bg-signal/90 font-semibold text-sm transition"
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
            <span className="text-xs text-slate-500">
              {job.source_name} &middot; Found {job.date_found} &middot; Last seen {job.date_last_seen}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
