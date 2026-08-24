import { describe, expect, it } from "vitest";

import {
  createDailySession,
  getDailySessionCookieName,
  getAuthorizedClueRound,
  readDailySession,
  recordDailyGuess,
  signDailySession,
} from "./daily-session";

const dateKey = "2026-08-22";
const secret = "test-only-session-secret";

describe("daily session", () => {
  it("uses a host-only cookie prefix in production", () => {
    expect(getDailySessionCookieName("development")).toBe("terraria-daily-session");
    expect(getDailySessionCookieName("production")).toBe("__Host-terraria-daily-session");
  });

  it("signs progress and rejects tampered or stale session values", () => {
    const session = createDailySession(dateKey);
    const signed = signDailySession(session, secret);

    expect(readDailySession(signed, dateKey, secret)).toEqual(session);
    expect(readDailySession(`${signed}x`, dateKey, secret)).toBeUndefined();
    expect(readDailySession(signed, "2026-08-23", secret)).toBeUndefined();
  });

  it("authorizes only the next clue and records a terminal fifth loss", () => {
    let session = createDailySession(dateKey);
    expect(getAuthorizedClueRound(session)).toBe(1);

    for (let index = 0; index < 4; index += 1) {
      session = recordDailyGuess(session, `item:${index}`, false)!;
      expect(getAuthorizedClueRound(session)).toBe(index + 2);
    }

    session = recordDailyGuess(session, "item:4", false)!;
    expect(session.status).toBe("lost");
    expect(getAuthorizedClueRound(session)).toBe(0);
  });

  it("does not accept duplicate guesses or further guesses after completion", () => {
    const first = recordDailyGuess(createDailySession(dateKey), "item:1", false)!;
    expect(recordDailyGuess(first, "item:1", false)).toBeUndefined();

    const won = recordDailyGuess(createDailySession(dateKey), "item:2", true)!;
    expect(recordDailyGuess(won, "item:3", false)).toBeUndefined();
  });
});
