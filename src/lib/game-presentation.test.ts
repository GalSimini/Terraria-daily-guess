import { describe, expect, it } from "vitest";
import { formatTimeUntilNextUtcDay } from "./game-presentation";

describe("game presentation", () => {
  it("formats the remaining time to the next UTC day", () => {
    expect(formatTimeUntilNextUtcDay(new Date("2026-08-20T23:59:01.000Z"))).toBe("00:00:59");
  });
});
