export function getPriorityColor(priority: number): string {
  if (priority <= 1)
    return "bg-amber-50 text-amber-800 border border-amber-200";
  if (priority <= 3)
    return "bg-sky-50 text-sky-800 border border-sky-200";
  if (priority <= 6)
    return "bg-slate-50 text-slate-700 border border-slate-200";
  return "bg-stone-50 text-stone-700 border border-stone-200";
}

export function getConfidenceColor(confidence: string): string {
  switch (confidence) {
    case "High":
      return "bg-emerald-100 text-emerald-800 border border-emerald-200";
    case "Medium":
      return "bg-amber-100 text-amber-800 border border-amber-200";
    case "Low":
      return "bg-slate-100 text-slate-700 border border-slate-200";
    default:
      return "bg-slate-100 text-slate-700 border border-slate-200";
  }
}
