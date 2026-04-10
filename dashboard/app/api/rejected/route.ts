import { NextResponse } from "next/server";
import { getRejectedJobs } from "@/lib/jobs";

export async function GET() {
  const rejected = getRejectedJobs();
  return NextResponse.json(rejected);
}
