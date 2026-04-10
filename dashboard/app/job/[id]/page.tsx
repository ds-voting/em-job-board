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

  return (
    <>
      <Link
        href="/"
        className="text-blue-600 hover:underline text-sm mb-4 inline-block"
      >
        &larr; Back to all jobs
      </Link>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
            <p className="text-lg text-gray-600 mt-1">{job.employer}</p>
          </div>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getConfidenceColor(job.match_confidence)}`}
          >
            {job.match_confidence} Confidence
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(job.location_priority)}`}
          >
            {job.location} ({job.location_region})
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
            {job.salary}
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
            {job.institution_type}
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            {job.schedule_type}
          </span>
        </div>

        {job.red_flags.length > 0 && (
          <div className="mt-3 flex gap-1">
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

        <div className="mt-6 border-t border-gray-200 pt-4">
          <h2 className="font-semibold text-gray-900 mb-2">
            AI Analysis Notes
          </h2>
          <p className="text-sm text-gray-700">{job.analysis_notes}</p>
        </div>

        {job.full_description && (
          <div className="mt-4 border-t border-gray-200 pt-4">
            <h2 className="font-semibold text-gray-900 mb-2">
              Full Description
            </h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {job.full_description}
            </p>
          </div>
        )}

        <div className="mt-6 border-t border-gray-200 pt-4 flex flex-wrap gap-4">
          <a
            href={job.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
          >
            View Original Posting &rarr;
          </a>
        </div>

        <div className="mt-4 text-xs text-gray-400">
          Source: {job.source_name} &middot; First found: {job.date_found}{" "}
          &middot; Last seen: {job.date_last_seen} &middot; Status: {job.status}
        </div>
      </div>
    </>
  );
}
