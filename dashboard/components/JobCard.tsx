import Link from "next/link";
import { Job } from "@/lib/types";
import { getPriorityColor, getConfidenceColor } from "@/lib/utils";

interface JobCardProps {
  job: Job;
}

export default function JobCard({ job }: JobCardProps) {
  return (
    <Link
      href={`/job/${job.id}`}
      className="block bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 truncate">
              {job.title}
            </h3>
            {job.is_new && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                New
              </span>
            )}
            {job.status === "possibly_filled" && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                Possibly Filled
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1">{job.employer}</p>
        </div>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getConfidenceColor(job.match_confidence)}`}
        >
          {job.match_confidence}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(job.location_priority)}`}
        >
          {job.location}
        </span>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          {job.salary}
        </span>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          {job.institution_type}
        </span>
      </div>

      {job.red_flags.length > 0 && (
        <div className="mt-2 flex gap-1">
          {job.red_flags.map((flag) => (
            <span
              key={flag}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"
            >
              {flag}
            </span>
          ))}
        </div>
      )}

      <p className="mt-2 text-xs text-gray-400">
        {job.source_name} &middot; Found {job.date_found}
      </p>
    </Link>
  );
}
