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
