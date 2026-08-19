import { describe, expect, it } from "vitest";
import { MAX_ATTEMPTS, createGameState, createPlayerStats, settleStats, submitGuess } from "./game-state";

describe("game state", () => {
  it("wins on a correct guess and applies stats once", () => {
    const state = submitGuess(createGameState("2026-08-19"), "item:1", true);
    expect(state.status).toBe("won");
    expect(settleStats(createPlayerStats(), state).wins).toBe(1);
    expect(settleStats(settleStats(createPlayerStats(), state), state).gamesPlayed).toBe(1);
  });
  it("loses after five unique incorrect guesses", () => {
    let state = createGameState("2026-08-19");
    for (let index = 0; index < MAX_ATTEMPTS; index += 1) state = submitGuess(state, `item:${index}`, false);
    expect(state.status).toBe("lost");
  });
});
