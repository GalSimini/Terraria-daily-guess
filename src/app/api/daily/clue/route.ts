import { NextResponse } from "next/server";
import { z } from "zod";
import { getDailyClues } from "@/lib/catalog";
import {
  createDailySession,
  DAILY_SESSION_COOKIE,
  DAILY_SESSION_MAX_AGE_SECONDS,
  getAuthorizedClueRound,
  readDailySession,
  signDailySession,
} from "@/lib/daily-session";
import { getUtcDateKey } from "@/lib/daily-puzzle";
import { checkDailyApiRateLimit, readCookie } from "@/lib/request-security";

export const dynamic = "force-dynamic";

const QuerySchema = z.object({ dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), round: z.coerce.number().int().min(1).max(5) });
const API_HEADERS = { "Cache-Control": "no-store, max-age=0", Vary: "Cookie" };

export function GET(request: Request) {
  const rateLimit = checkDailyApiRateLimit(request, "clue");
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many daily requests." }, { status: 429, headers: { ...API_HEADERS, "Retry-After": String(rateLimit.retryAfterSeconds) } });
  }

  const parsed = QuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success || parsed.data.dateKey !== getUtcDateKey(new Date())) return NextResponse.json({ error: "Invalid daily clue request." }, { status: 400, headers: API_HEADERS });

  const existingSession = readDailySession(readCookie(request, DAILY_SESSION_COOKIE), parsed.data.dateKey);
  const session = existingSession ?? createDailySession(parsed.data.dateKey);
  if (parsed.data.round > getAuthorizedClueRound(session)) {
    return NextResponse.json({ error: "Clue is not unlocked." }, { status: 403, headers: API_HEADERS });
  }

  const clue = getDailyClues(parsed.data.dateKey)[parsed.data.round - 1];
  if (!clue) return NextResponse.json({ error: "Clue unavailable." }, { status: 404, headers: API_HEADERS });

  const response = NextResponse.json({ clue: clue.text }, { headers: API_HEADERS });
  if (!existingSession) {
    response.cookies.set({
      name: DAILY_SESSION_COOKIE,
      value: signDailySession(session),
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: DAILY_SESSION_MAX_AGE_SECONDS,
      priority: "high",
    });
  }
  return response;
}
