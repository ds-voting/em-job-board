// Neutral tag style shared by every descriptive (non-evaluative) badge:
// location, salary, institution type. Priority/region no longer gets its
// own hue — it already drives sort order, which is where it matters.
export const NEUTRAL_TAG =
  "bg-slate-100 text-slate-600 border border-slate-200";

export function getConfidenceColor(confidence: string): string {
  switch (confidence) {
    // High confidence is the one evaluative signal that earns color —
    // "this is worth her time." Medium/Low recede into neutral gray,
    // distinguished by weight rather than hue.
    case "High":
      return "bg-vital-50 text-vital border border-vital/20";
    case "Medium":
      return "bg-slate-100 text-slate-700 border border-slate-200";
    case "Low":
      return "bg-slate-50 text-slate-500 border border-slate-200";
    default:
      return "bg-slate-50 text-slate-500 border border-slate-200";
  }
}

// Left-edge status stripe on a job card: a value distinction (dark vs.
// muted), not a new hue — status is a separate axis from match confidence.
export function getStatusStripeColor(status: string): string {
  return status === "active" ? "bg-ink" : "bg-slate-300";
}
