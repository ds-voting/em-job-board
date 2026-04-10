export interface Job {
  id: string;
  title: string;
  employer: string;
  location: string;
  location_region: string;
  location_priority: number;
  salary: string;
  salary_numeric: number | null;
  institution_type: string;
  schedule_type: string;
  is_nocturnist_only: boolean;
  match_confidence: "High" | "Medium" | "Low";
  analysis_notes: string;
  source_url: string;
  source_name: string;
  description_snippet: string;
  full_description: string;
  date_found: string;
  date_last_seen: string;
  status: "active" | "possibly_filled";
  is_new: boolean;
  red_flags: string[];
  missed_scrapes: number;
}

export interface RejectedJob {
  id: string;
  title: string;
  employer: string;
  location: string;
  salary: string;
  source_url: string;
  source_name: string;
  rejection_reason: string;
  description_snippet: string;
  date_found: string;
}

export type Region =
  | "Bay Area, CA"
  | "San Diego, CA"
  | "California Coast"
  | "Denver/Boulder, CO"
  | "Bozeman, MT"
  | "Stamford, CT"
  | "Boston, MA"
  | "Other East Coast"
  | "Unknown";

export type MatchConfidence = "High" | "Medium" | "Low";

export type InstitutionType =
  | "Academic Medical Center"
  | "Trauma Level I"
  | "Trauma Level II"
  | "Trauma Level III"
  | "Private Hospital Group"
  | "Community Hospital"
  | "Unknown";
