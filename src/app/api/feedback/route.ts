import { NextResponse } from "next/server";

/**
 * POST /api/feedback — stores recommendation feedback.
 *
 * Current: in-memory log per deployment instance. Good enough for demo
 * observability (you can eyeball what's coming in via server logs).
 *
 * Phase 2: persist to Postgres:
 *
 *   CREATE TABLE recommendation_feedback (
 *     id          bigserial PRIMARY KEY,
 *     user_id     text,                      -- nullable: anonymous is allowed
 *     session_id  text,                      -- for anon grouping
 *     item_key    text NOT NULL,             -- project|bedrooms
 *     sentiment   text NOT NULL CHECK (sentiment IN ('up','down')),
 *     comment     text,
 *     page        text NOT NULL,             -- market-analysis, trends, mls, ...
 *     context     jsonb,                     -- verdict/score snapshot at feedback time
 *     created_at  timestamptz NOT NULL DEFAULT now()
 *   );
 *
 * Phase 2 will also expose GET /api/feedback?user_id=... for the
 * "Feedback history" tile on /account.
 */

interface FeedbackPayload {
  item_key?: string;
  sentiment?: "up" | "down";
  comment?: string;
  context?: Record<string, unknown>;
  page?: string;
  user_id?: string;
}

const LOG_MAX = 200;
const inMemoryLog: (FeedbackPayload & { received_at: string })[] = [];

export function getRecentFeedback(): typeof inMemoryLog {
  return [...inMemoryLog].reverse();
}

export async function POST(request: Request) {
  let payload: FeedbackPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!payload.item_key || typeof payload.item_key !== "string") {
    return NextResponse.json({ error: "item_key required" }, { status: 400 });
  }
  if (payload.sentiment !== "up" && payload.sentiment !== "down") {
    return NextResponse.json({ error: "sentiment must be 'up' or 'down'" }, { status: 400 });
  }

  const entry = {
    ...payload,
    received_at: new Date().toISOString(),
  };
  inMemoryLog.push(entry);
  if (inMemoryLog.length > LOG_MAX) inMemoryLog.shift();

  // Log to server console so tailing logs gives us a feedback feed.
  console.log("[feedback]", entry);

  return NextResponse.json({ ok: true, received_at: entry.received_at });
}

export async function GET() {
  // Quick health endpoint — helpful during QA.
  return NextResponse.json({
    ok: true,
    count: inMemoryLog.length,
    latest: inMemoryLog.slice(-5),
  });
}
