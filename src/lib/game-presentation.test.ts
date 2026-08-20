import { describe, expect, it } from "vitest";
import { createGameState, submitGuess } from "../features/game/game-state";
import { createShareText, formatTimeUntilNextUtcDay } from "./game-presentation";

describe("game presentation", () => {
  it("formats the remaining time to the next UTC day", () => {
    expect(formatTimeUntilNextUtcDay(new Date("2026-08-20T23:59:01.000Z"))).toBe("00:00:59");
  });

  it("creates a spoiler-free result grid", () => {
    const firstGuess = submitGuess(createGameState("2026-08-20"), "item:1", false);
    const won = submitGuess(firstGuess, "item:2", true);
    expect(createShareText(won)).toBe("Terraria Daily Guess · 2026-08-20\n2/5\n⬛🟩");
  });
});
