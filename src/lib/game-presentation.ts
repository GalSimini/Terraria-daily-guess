import type { GameState } from "@/features/game/game-state";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function formatTimeUntilNextUtcDay(now: Date): string {
  const nextMidnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
  );
  const remainingSeconds = Math.max(0, Math.floor((nextMidnight - now.getTime()) / 1000));
  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function createShareText(game: GameState): string {
  const score = game.status === "won" ? `${game.guesses.length}/5` : "X/5";
  const grid = Array.from({ length: game.guesses.length }, (_, index) =>
    game.status === "won" && index === game.guesses.length - 1 ? "🟩" : "⬛",
  ).join("");
  return `Terraria Daily Guess · ${game.dateKey}\n${score}\n${grid}`;
}
