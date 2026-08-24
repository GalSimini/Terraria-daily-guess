import { createHmac, timingSafeEqual } from "node:crypto";

import { z } from "zod";

const DAILY_SESSION_COOKIE_BASENAME = "terraria-daily-session";
export const DAILY_SESSION_MAX_AGE_SECONDS = 60 * 60 * 36;

const DEVELOPMENT_SESSION_SECRET = "development-only-session-secret";
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

const DailySessionSchema = z
  .object({
    version: z.literal(1),
    dateKey: z.string().regex(DATE_KEY),
    guesses: z.array(z.string().min(1)).max(5),
    status: z.enum(["playing", "won", "lost"]),
  })
  .superRefine((session, context) => {
    if (new Set(session.guesses).size !== session.guesses.length) {
      context.addIssue({ code: "custom", message: "Guesses must be unique." });
    }

    if (session.status === "lost" && session.guesses.length !== 5) {
      context.addIssue({ code: "custom", message: "A loss requires five guesses." });
    }

    if (session.status === "playing" && session.guesses.length === 5) {
      context.addIssue({ code: "custom", message: "Five guesses must complete the game." });
    }
  });

export type DailySession = z.infer<typeof DailySessionSchema>;

export function getDailySessionCookieName(environment = process.env.NODE_ENV): string {
  return environment === "production" ? `__Host-${DAILY_SESSION_COOKIE_BASENAME}` : DAILY_SESSION_COOKIE_BASENAME;
}

export const DAILY_SESSION_COOKIE = getDailySessionCookieName();

export function getDailySessionSecret(): string {
  const configured = process.env.DAILY_SESSION_SECRET?.trim();

  if (process.env.NODE_ENV === "production" && (!configured || configured === DEVELOPMENT_SESSION_SECRET)) {
    throw new Error("DAILY_SESSION_SECRET must be configured in production.");
  }

  return configured || DEVELOPMENT_SESSION_SECRET;
}

export function createDailySession(dateKey: string): DailySession {
  if (!DATE_KEY.test(dateKey)) {
    throw new Error("dateKey must use the UTC YYYY-MM-DD format.");
  }

  return { version: 1, dateKey, guesses: [], status: "playing" };
}

export function getAuthorizedClueRound(session: DailySession): number {
  if (session.status !== "playing") return 0;
  return Math.min(session.guesses.length + 1, 5);
}

export function recordDailyGuess(session: DailySession, guessId: string, correct: boolean): DailySession | undefined {
  if (session.status !== "playing" || session.guesses.includes(guessId)) return undefined;

  const guesses = [...session.guesses, guessId];
  return {
    ...session,
    guesses,
    status: correct ? "won" : guesses.length === 5 ? "lost" : "playing",
  };
}

export function signDailySession(session: DailySession, secret = getDailySessionSecret()): string {
  const payload = Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
  const signature = createSignature(payload, secret);
  return `${payload}.${signature}`;
}

export function readDailySession(value: string | undefined, dateKey: string, secret = getDailySessionSecret()): DailySession | undefined {
  if (!value || !DATE_KEY.test(dateKey)) return undefined;

  const parts = value.split(".");
  if (parts.length !== 2) return undefined;

  const [payload, signature] = parts;
  if (!payload || !signature || !signaturesMatch(signature, createSignature(payload, secret))) return undefined;

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const session = DailySessionSchema.safeParse(decoded).data;
    return session?.dateKey === dateKey ? session : undefined;
  } catch {
    return undefined;
  }
}

function createSignature(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function signaturesMatch(received: string, expected: string): boolean {
  const receivedBuffer = Buffer.from(received, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
}
