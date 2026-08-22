export const MAX_GUESS_REQUEST_BYTES = 4_096;

export class InvalidJsonRequestError extends Error {}
export class RequestTooLargeError extends Error {}

export type RateLimitResult = Readonly<{
  allowed: boolean;
  retryAfterSeconds: number;
}>;

type RateLimitEntry = Readonly<{
  count: number;
  resetAt: number;
}>;

export function createFixedWindowRateLimiter(options: Readonly<{
  limit: number;
  windowMs: number;
  now?: () => number;
}>) {
  const entries = new Map<string, RateLimitEntry>();
  const now = options.now ?? Date.now;

  return {
    check(key: string): RateLimitResult {
      const currentTime = now();
      const existing = entries.get(key);
      const entry = !existing || existing.resetAt <= currentTime
        ? { count: 0, resetAt: currentTime + options.windowMs }
        : existing;
      const nextCount = entry.count + 1;
      entries.set(key, { ...entry, count: nextCount });

      return {
        allowed: nextCount <= options.limit,
        retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - currentTime) / 1_000)),
      };
    },
  };
}

const dailyApiRateLimiter = createFixedWindowRateLimiter({ limit: 12, windowMs: 60_000 });

export function checkDailyApiRateLimit(request: Request, route: "clue" | "guess"): RateLimitResult {
  return dailyApiRateLimiter.check(`${route}:${getClientIdentifier(request)}`);
}

export function getClientIdentifier(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || request.headers.get("x-real-ip") || "unknown-client";
}

export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export function readCookie(request: Request, name: string): string | undefined {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return undefined;

  for (const cookie of cookieHeader.split(";")) {
    const separator = cookie.indexOf("=");
    if (separator < 1) continue;
    if (cookie.slice(0, separator).trim() === name) return cookie.slice(separator + 1).trim();
  }

  return undefined;
}

export async function readJsonRequest(request: Request, maximumBytes = MAX_GUESS_REQUEST_BYTES): Promise<unknown> {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json") throw new InvalidJsonRequestError();

  const declaredLength = request.headers.get("content-length");
  if (declaredLength && (!/^\d+$/.test(declaredLength) || Number(declaredLength) > maximumBytes)) {
    throw new RequestTooLargeError();
  }

  if (!request.body) throw new InvalidJsonRequestError();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalLength = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalLength += value.byteLength;
    if (totalLength > maximumBytes) {
      await reader.cancel();
      throw new RequestTooLargeError();
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new InvalidJsonRequestError();
  }
}
