import { Job, RejectedJob } from "./types";
import fs from "fs";
import path from "path";
export { getPriorityColor, getConfidenceColor } from "./utils";

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

