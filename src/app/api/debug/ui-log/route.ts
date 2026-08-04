import { appendFile } from "node:fs/promises";
import { NextResponse } from "next/server";

type DebugPayload = {
  hypothesisId: string;
  location: string;
  message: string;
  data: Record<string, unknown>;
  timestamp: number;
};

function isDebugPayload(value: unknown): value is DebugPayload {
  return (
    value !== null &&
    typeof value === "object" &&
    "hypothesisId" in value &&
    typeof value.hypothesisId === "string" &&
    "location" in value &&
    typeof value.location === "string" &&
    "message" in value &&
    typeof value.message === "string" &&
    "data" in value &&
    value.data !== null &&
    typeof value.data === "object" &&
    "timestamp" in value &&
    typeof value.timestamp === "number"
  );
}

export async function POST(request: Request) {
  const payload: unknown = await request.json();
  if (!isDebugPayload(payload)) {
    return NextResponse.json({ error: "Invalid debug payload" }, { status: 400 });
  }

  // #region agent log
  await appendFile("/opt/cursor/logs/debug.log", `${JSON.stringify(payload)}\n`);
  // #endregion
  return new NextResponse(null, { status: 204 });
}
