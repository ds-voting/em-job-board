import Link from "next/link";
import { Job } from "@/lib/types";
import { getPriorityColor, getConfidenceColor } from "@/lib/utils";

interface JobCardProps {
  job: Job;
}

export default function JobCard({ job }: JobCardProps) {
  const isHigh = job.match_confidence === "High";
  const hasSalary = job.salary && job.salary !== "Not listed";

  return (
    <Link
      href={`/job/${job.id}`}
      className={`group block bg-white rounded-xl border ${
        isHigh ? "border-emerald-200" : "border-slate-200"
      } p-5 hover:shadow-lg hover:border-slate-300 transition-all duration-150 relative overflow-hidden`}
    >
      {isHigh && (
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-50 to-transparent rounded-bl-full pointer-events-none" />
      )}

      <div className="relative">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
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
            <h3 className="font-semibold text-slate-900 leading-snug group-hover:text-rose-600 transition-colors">
              {job.title}
            </h3>
            <p className="text-sm text-slate-600 mt-0.5 truncate">
              {job.employer}
            </p>
          </div>
          <span
            className={`shrink-0 inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold ${getConfidenceColor(job.match_confidence)}`}
          >
            {job.match_confidence}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-3">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium ${getPriorityColor(job.location_priority)}`}
          >
            <svg
              className="w-3 h-3"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                clipRule="evenodd"
              />
            </svg>
            {job.location}
          </span>
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium ${
              hasSalary
                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            <svg
              className="w-3 h-3"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 7.234 6 8.027 6 9c0 .973.602 1.766 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.973 14 12c0-.973-.602-1.766-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V6z"
                clipRule="evenodd"
              />
            </svg>
            {job.salary}
          </span>
          {job.institution_type && job.institution_type !== "Unknown" && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-violet-50 text-violet-700 border border-violet-100">
              {job.institution_type}
            </span>
          )}
        </div>

        {job.red_flags && job.red_flags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {job.red_flags.map((flag) => (
              <span
                key={flag}
                className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-700 border border-red-100"
              >
                ⚠ {flag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span className="font-medium">{job.source_name}</span>
          <span>Found {job.date_found}</span>
        </div>
      </div>
    </Link>
  );
}
