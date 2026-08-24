import { NextResponse } from "next/server";
import { z } from "zod";
import { getCatalogEntity, getDailyTarget } from "@/lib/catalog";
import {
  createDailySession,
  DAILY_SESSION_COOKIE,
  DAILY_SESSION_MAX_AGE_SECONDS,
  readDailySession,
  recordDailyGuess,
  signDailySession,
} from "@/lib/daily-session";
import { getUtcDateKey } from "@/lib/daily-puzzle";
import {
  checkDailyApiRateLimit,
  InvalidJsonRequestError,
  isSameOrigin,
  readCookie,
  readJsonRequest,
  RequestTooLargeError,
} from "@/lib/request-security";

export const dynamic = "force-dynamic";

const GuessSchema = z.object({ dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), guessId: z.string().min(1), expectedAttemptCount: z.number().int().min(0).max(4) }).strict();
const API_HEADERS = { "Cache-Control": "no-store, max-age=0", Vary: "Cookie, Origin" };

function setSessionCookie(response: NextResponse, session: ReturnType<typeof createDailySession>) {
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
  return response;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid daily guess request." }, { status: 403, headers: API_HEADERS });

  const rateLimit = checkDailyApiRateLimit(request, "guess");
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many daily requests." }, { status: 429, headers: { ...API_HEADERS, "Retry-After": String(rateLimit.retryAfterSeconds) } });
  }

  let body: unknown;
  try {
    body = await readJsonRequest(request);
  } catch (error) {
    if (error instanceof RequestTooLargeError) return NextResponse.json({ error: "Guess request is too large." }, { status: 413, headers: API_HEADERS });
    if (error instanceof InvalidJsonRequestError) return NextResponse.json({ error: "Invalid daily guess." }, { status: 400, headers: API_HEADERS });
    return NextResponse.json({ error: "Invalid daily guess." }, { status: 400, headers: API_HEADERS });
  }

  const parsed = GuessSchema.safeParse(body);
  if (!parsed.success || parsed.data.dateKey !== getUtcDateKey(new Date())) return NextResponse.json({ error: "Invalid daily guess." }, { status: 400, headers: API_HEADERS });
  if (!getCatalogEntity(parsed.data.guessId)) return NextResponse.json({ error: "Unknown entity." }, { status: 400, headers: API_HEADERS });

  const dateKey = parsed.data.dateKey;
  const session = readDailySession(readCookie(request, DAILY_SESSION_COOKIE), dateKey) ?? createDailySession(dateKey);
  if (session.guesses.length !== parsed.data.expectedAttemptCount) {
    return NextResponse.json({ error: "Game progress is out of sync. Reload and try again." }, { status: 409, headers: API_HEADERS });
  }
  if (session.status !== "playing") return NextResponse.json({ error: "Today's game is already complete." }, { status: 409, headers: API_HEADERS });
  if (session.guesses.includes(parsed.data.guessId)) return NextResponse.json({ error: "You have already guessed that entity." }, { status: 409, headers: API_HEADERS });

  const target = getDailyTarget(parsed.data.dateKey);
  const correct = parsed.data.guessId === target.id;
  const nextSession = recordDailyGuess(session, parsed.data.guessId, correct);
  if (!nextSession) return NextResponse.json({ error: "Invalid daily guess." }, { status: 400, headers: API_HEADERS });

  return setSessionCookie(
    NextResponse.json({
      correct,
      attemptCount: nextSession.guesses.length,
      answer: nextSession.status === "lost" ? { name: target.name } : undefined,
    }, { headers: API_HEADERS }),
    nextSession,
  );
}
