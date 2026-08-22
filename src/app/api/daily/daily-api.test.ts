import { describe, expect, it } from "vitest";

import { searchEntities, getDailyTarget } from "@/lib/catalog";
import { DAILY_SESSION_COOKIE } from "@/lib/daily-session";
import { getUtcDateKey } from "@/lib/daily-puzzle";

import { GET as getClue } from "./clue/route";
import { POST as postGuess } from "./guess/route";

const dateKey = getUtcDateKey(new Date());
const target = getDailyTarget(dateKey);
const wrongIds = searchEntities.filter((entity) => entity.id !== target.id).slice(0, 5).map((entity) => entity.id);

function cookieValue(response: Response): string {
  const cookie = response.headers.get("set-cookie");
  const match = cookie?.match(new RegExp(`${DAILY_SESSION_COOKIE}=([^;]+)`));
  if (!match?.[1]) throw new Error("Expected a daily session cookie.");
  return match[1];
}

function clueRequest(round: number, options: Readonly<{ cookie?: string; client?: string }> = {}) {
  return new Request(`http://game.test/api/daily/clue?dateKey=${dateKey}&round=${round}`, {
    headers: {
      ...(options.cookie ? { cookie: `${DAILY_SESSION_COOKIE}=${options.cookie}` } : {}),
      "x-forwarded-for": options.client ?? "198.51.100.1",
    },
  });
}

function guessRequest(guessId: string, expectedAttemptCount: number, options: Readonly<{ cookie?: string; client?: string; origin?: string }> = {}) {
  return new Request("http://game.test/api/daily/guess", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: options.origin ?? "http://game.test",
      "x-forwarded-for": options.client ?? "198.51.100.2",
      ...(options.cookie ? { cookie: `${DAILY_SESSION_COOKIE}=${options.cookie}` } : {}),
    },
    body: JSON.stringify({ dateKey, guessId, expectedAttemptCount }),
  });
}

describe("daily API security", () => {
  it("does not unlock future clues without signed server progress", async () => {
    const locked = getClue(clueRequest(2, { client: "198.51.100.10" }));
    expect(locked.status).toBe(403);
    expect(await locked.json()).toEqual({ error: "Clue is not unlocked." });
    expect(locked.headers.get("cache-control")).toContain("no-store");

    const first = getClue(clueRequest(1, { client: "198.51.100.11" }));
    expect(first.status).toBe(200);
    expect(await first.json()).toHaveProperty("clue");
    expect(first.headers.get("set-cookie")).toContain("HttpOnly");
    expect(first.headers.get("set-cookie")).toContain("SameSite=strict");
  });

  it("rejects an untrusted fifth-attempt claim without revealing the answer", async () => {
    const response = await postGuess(guessRequest(wrongIds[0]!, 4, { client: "198.51.100.12" }));
    expect(response.status).toBe(409);
    expect(await response.json()).not.toHaveProperty("answer");
  });

  it("allows an answer only after five server-authorized wrong guesses", async () => {
    let cookie: string | undefined;

    for (let index = 0; index < wrongIds.length; index += 1) {
      const response = await postGuess(guessRequest(wrongIds[index]!, index, { cookie, client: "198.51.100.13" }));
      const result = await response.json() as { answer?: { name: string }; attemptCount?: number; status?: string };
      expect(response.status).toBe(200);
      expect(result.attemptCount).toBe(index + 1);
      if (index < 4) expect(result.answer).toBeUndefined();
      cookie = cookieValue(response);
    }

    expect(cookie).toBeDefined();
    const completed = await postGuess(guessRequest(wrongIds[0]!, 0, { cookie, client: "198.51.100.13" }));
    expect(completed.status).toBe(409);
    expect(await completed.json()).not.toHaveProperty("answer");
  });

  it("rejects cross-origin and malformed guess requests", async () => {
    const crossOrigin = await postGuess(guessRequest(wrongIds[0]!, 0, { origin: "https://attacker.example", client: "198.51.100.14" }));
    expect(crossOrigin.status).toBe(403);

    const malformed = await postGuess(new Request("http://game.test/api/daily/guess", {
      method: "POST",
      headers: { origin: "http://game.test", "content-type": "application/json", "x-forwarded-for": "198.51.100.15" },
      body: "not-json",
    }));
    expect(malformed.status).toBe(400);
    expect(malformed.headers.get("cache-control")).toContain("no-store");
  });
});
