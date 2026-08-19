import { z } from "zod";

export const MAX_ATTEMPTS = 5;

const GameStateSchema = z.object({
  version: z.literal(1),
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guesses: z.array(z.string()).max(MAX_ATTEMPTS),
  status: z.enum(["playing", "won", "lost"]),
});

const StatsSchema = z.object({
  version: z.literal(1),
  gamesPlayed: z.number().int().nonnegative(),
  wins: z.number().int().nonnegative(),
  currentStreak: z.number().int().nonnegative(),
  maxStreak: z.number().int().nonnegative(),
  guessDistribution: z.record(z.string(), z.number().int().nonnegative()),
  lastSettledDate: z.string().optional(),
});

export type GameState = z.infer<typeof GameStateSchema>;
export type PlayerStats = z.infer<typeof StatsSchema>;

export const createGameState = (dateKey: string): GameState => ({ version: 1, dateKey, guesses: [], status: "playing" });
export const createPlayerStats = (): PlayerStats => ({ version: 1, gamesPlayed: 0, wins: 0, currentStreak: 0, maxStreak: 0, guessDistribution: {}, });
export const parseGameState = (value: unknown) => GameStateSchema.safeParse(value).data;
export const parsePlayerStats = (value: unknown) => StatsSchema.safeParse(value).data;

export function submitGuess(state: GameState, guessId: string, isCorrect: boolean): GameState {
  if (state.status !== "playing" || state.guesses.includes(guessId)) return state;
  const guesses = [...state.guesses, guessId];
  return { ...state, guesses, status: isCorrect ? "won" : guesses.length === MAX_ATTEMPTS ? "lost" : "playing" };
}

export function settleStats(stats: PlayerStats, state: GameState): PlayerStats {
  if (state.status === "playing" || stats.lastSettledDate === state.dateKey) return stats;
  const won = state.status === "won";
  const currentStreak = won ? stats.currentStreak + 1 : 0;
  const round = String(state.guesses.length);
  return { ...stats, gamesPlayed: stats.gamesPlayed + 1, wins: stats.wins + Number(won), currentStreak, maxStreak: Math.max(stats.maxStreak, currentStreak), guessDistribution: won ? { ...stats.guessDistribution, [round]: (stats.guessDistribution[round] ?? 0) + 1 } : stats.guessDistribution, lastSettledDate: state.dateKey };
}
