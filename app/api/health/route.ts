import { NextResponse } from "next/server";
import { sql } from "../../../db";
import { getLastSweepAt } from "../../../lib/health-state";

export const runtime = "nodejs";

const SWEEP_STALE_AFTER_MS = 90_000;

export async function GET() {
  const checks: Record<string, string> = {};
  let healthy = true;

  try {
    await sql`select 1`;
    checks.database = "ok";
  } catch {
    checks.database = "error";
    healthy = false;
  }

  const lastSweepAt = getLastSweepAt();
  if (lastSweepAt === null) {
    checks.expiryWorker = "not yet run";
  } else if (Date.now() - lastSweepAt < SWEEP_STALE_AFTER_MS) {
    checks.expiryWorker = "ok";
  } else {
    checks.expiryWorker = "stalled";
    healthy = false;
  }
  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      checks,
      lastSweepAt: lastSweepAt ? new Date(lastSweepAt).toISOString() : null,
      uptimeSeconds: Math.round(process.uptime()),
    },
    { status: healthy ? 200 : 503 },
  );
}
