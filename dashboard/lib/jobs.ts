import { Job, RejectedJob } from "./types";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "..", "data");

export function getJobs(): Job[] {
  try {
    const raw = fs.readFileSync(path.join(DATA_DIR, "jobs.json"), "utf-8");
    return JSON.parse(raw) as Job[];
  } catch {
    return [];
  }
}

export function getRejectedJobs(): RejectedJob[] {
  try {
    const raw = fs.readFileSync(path.join(DATA_DIR, "rejected.json"), "utf-8");
    return JSON.parse(raw) as RejectedJob[];
  } catch {
    return [];
  }
}

export function getJobById(id: string): Job | undefined {
  const jobs = getJobs();
  return jobs.find((j) => j.id === id);
}

export function getStats(jobs: Job[]) {
  const active = jobs.filter((j) => j.status === "active");
  const newJobs = active.filter((j) => j.is_new);

  const byRegion: Record<string, number> = {};
  for (const job of active) {
    const region = job.location_region || "Unknown";
    byRegion[region] = (byRegion[region] || 0) + 1;
  }

  const lastScrape = jobs.reduce((latest, j) => {
    return j.date_last_seen > latest ? j.date_last_seen : latest;
  }, "");

  return {
    totalActive: active.length,
    newCount: newJobs.length,
    byRegion,
    lastScrape,
    possiblyFilled: jobs.filter((j) => j.status === "possibly_filled").length,
  };
}

export function getPriorityColor(priority: number): string {
  if (priority <= 1) return "bg-amber-400 text-amber-900";
  if (priority <= 3) return "bg-slate-300 text-slate-800";
  return "bg-orange-300 text-orange-900";
}

export function getConfidenceColor(confidence: string): string {
  switch (confidence) {
    case "High":
      return "bg-green-100 text-green-800";
    case "Medium":
      return "bg-yellow-100 text-yellow-800";
    case "Low":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}
