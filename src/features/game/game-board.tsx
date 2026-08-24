"use client";

import Fuse from "fuse.js";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  createGameState,
  createPlayerStats,
  parseGameState,
  parsePlayerStats,
  settleStats,
  submitGuess,
  type GameState,
  type PlayerStats,
} from "@/features/game/game-state";
import { createShareText, formatTimeUntilNextUtcDay } from "@/lib/game-presentation";

type SearchEntity = Readonly<{
  id: string;
  name: string;
  aliases: readonly string[];
  kind: string;
  category: string;
}>;

type Props = Readonly<{
  dateKey: string;
  entities: readonly SearchEntity[];
  entityContext: Readonly<{ kind: string; category: string }>;
  initialClue: string;
  initialNow: number;
}>;

const gameKey = (dateKey: string) => `terraria-daily-guess:game:v2:${dateKey}`;
const statsKey = "terraria-daily-guess:stats";

export function GameBoard({ dateKey, entities, entityContext, initialClue, initialNow }: Props) {
  const [game, setGame] = useState<GameState>(() => createGameState(dateKey));
  const [stats, setStats] = useState<PlayerStats>(createPlayerStats);
  const [clues, setClues] = useState([initialClue]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string>();
  const [answer, setAnswer] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [clueLoading, setClueLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(initialNow);

  const selected = entities.find((entity) => entity.id === selectedId);
  const fuse = useMemo(
    () => new Fuse(entities, { keys: ["name", "aliases"], threshold: 0.35, ignoreLocation: true }),
    [entities],
  );
  const matches = query.trim() ? fuse.search(query, { limit: 6 }).map(({ item }) => item) : [];
  const winRate = stats.gamesPlayed ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0;

  useEffect(() => {
    const hydrationTimer = window.setTimeout(() => {
      try {
        const savedGame = parseGameState(JSON.parse(localStorage.getItem(gameKey(dateKey)) ?? "null"));
        const savedStats = parsePlayerStats(JSON.parse(localStorage.getItem(statsKey) ?? "null"));
        setGame(savedGame?.dateKey === dateKey ? savedGame : createGameState(dateKey));
        setStats(savedStats ?? createPlayerStats());
      } catch {
        setMessage("Saved local data could not be read and was reset.");
      }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(hydrationTimer);
  }, [dateKey]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(gameKey(dateKey), JSON.stringify(game));
  }, [dateKey, game, ready]);

  useEffect(() => {
    if (ready) localStorage.setItem(statsKey, JSON.stringify(stats));
  }, [ready, stats]);

  useEffect(() => {
    const round = game.guesses.length + 1;
    if (!ready || game.status !== "playing" || clues.length >= round) return;

    const controller = new AbortController();
    fetch(`/api/daily/clue?dateKey=${dateKey}&round=${round}`, { signal: controller.signal })
      .then(async (response) => (response.ok ? response.json() : Promise.reject(new Error("Unable to load the next clue."))))
      .then((data: { clue?: string }) => {
        const clue = data.clue;
        if (clue) setClues((current) => [...current, clue]);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setMessage("The next clue could not be loaded. Please try again.");
      })
      .finally(() => setClueLoading(false));
    return () => controller.abort();
  }, [clues.length, dateKey, game.guesses.length, game.status, ready]);

  function choose(entity: SearchEntity) {
    setSelectedId(entity.id);
    setQuery(entity.name);
    setMessage(undefined);
  }

  async function guess() {
    if (!selected || busy || game.status !== "playing") return;
    if (game.guesses.includes(selected.id)) {
      setMessage("You have already guessed that entity.");
      return;
    }

    setBusy(true);
    setMessage(undefined);
    try {
      const response = await fetch("/api/daily/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateKey, guessId: selected.id, expectedAttemptCount: game.guesses.length }),
      });
      const result: { correct?: boolean; answer?: { name: string }; attemptCount?: number; error?: string } = await response.json();
      if (!response.ok || typeof result.correct !== "boolean") {
        setMessage(result.error ?? "Your guess could not be validated. Please try again.");
        return;
      }
      const next = submitGuess(game, selected.id, result.correct);
      if (result.attemptCount !== next.guesses.length) {
        setMessage("Game progress is out of sync. Reload and try again.");
        return;
      }
      setGame(next);
      if (result.answer) setAnswer(result.answer.name);
      if (next.status !== "playing") setStats((current) => settleStats(current, next));
      if (next.status === "playing") setClueLoading(true);
      setQuery("");
      setSelectedId(undefined);
    } catch {
      setMessage("A network error prevented validation. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function shareResult() {
    try {
      await navigator.clipboard.writeText(createShareText(game));
      setMessage("Result copied without revealing the answer.");
    } catch {
      setMessage("Copy failed. Your browser may block clipboard access.");
    }
  }

  function resetStats() {
    if (!window.confirm("Reset all local statistics? This cannot be undone.")) return;
    setStats(createPlayerStats());
    setMessage("Local statistics were reset.");
  }

  return (
    <main className="game-shell">
      <div className="game-content space-y-6">
        <header className="relative text-center">
          <div className="absolute top-0 right-0"><ThemeToggle /></div>
          <p className="pixel-label">Daily challenge · {dateKey}</p>
          <h1 className="game-logo mt-3">
            <Image src="/terraria-guesser-logo.png" alt="Terraria Guesser" width={2172} height={724} priority />
          </h1>
          <p className="muted-text mt-3 text-sm">Next daily challenge in <span aria-live="off">{formatTimeUntilNextUtcDay(new Date(now))}</span></p>
        </header>

        {message && <p role="status" className="game-card border-amber-200/50 bg-amber-950/35 px-3 py-2 text-sm text-amber-50">{message}</p>}

        <section className="game-card game-card--context p-5 text-center" aria-label="Today&apos;s entity context">
          <p className="pixel-label">Today&apos;s entity</p>
          <p className="mt-2 text-2xl font-bold capitalize">{entityContext.kind}</p>
          <p className="muted-text mt-1 text-sm capitalize">{entityContext.category}</p>
        </section>

        <section className="game-card p-5" aria-labelledby="clues-heading">
          <h2 id="clues-heading" className="font-semibold">Clues</h2>
          <ol className="mt-3 space-y-2">{Array.from({ length: 5 }, (_, index) => <li key={index} className={`clue-card px-3 py-2 text-sm ${clues[index] ? "" : "clue-card--locked"}`}>{clues[index] ?? (clueLoading && index === clues.length ? "Loading next clue…" : `Round ${index + 1} unlocks after an incorrect guess.`)}</li>)}</ol>
        </section>

        <section className="game-card p-5">
          <label htmlFor="entity-search" className="font-semibold">Your guess</label>
          <div className="mt-3 flex gap-2"><input id="entity-search" value={query} disabled={game.status !== "playing"} onChange={(event) => { setQuery(event.target.value); setSelectedId(undefined); }} onKeyDown={(event) => { if (event.key === "Enter" && matches[0]) choose(matches[0]); }} placeholder="Search 5,000+ Terraria entities..." className="game-input w-full px-3 py-2" autoComplete="off" /><button type="button" onClick={guess} disabled={!selected || busy || game.status !== "playing"} className="game-button game-button--primary px-4 font-bold">{busy ? "Checking…" : "Guess"}</button></div>
          {matches.length > 0 && <ul className="search-results mt-2 overflow-hidden" aria-label="Search results">{matches.map((entity) => <li key={entity.id}><button type="button" onClick={() => choose(entity)} className="search-result flex w-full justify-between px-3 py-2 text-left"><span>{entity.name}</span><span className="muted-text text-xs">{entity.category}</span></button></li>)}</ul>}
        </section>

        <section className="game-card p-5"><h2 className="font-semibold">Attempts</h2><ol className="mt-3 space-y-2">{game.guesses.map((id) => <li key={id} className="clue-card px-3 py-2">{entities.find((entry) => entry.id === id)?.name}</li>)}{Array.from({ length: 5 - game.guesses.length }, (_, index) => <li key={`empty-${index}`} className="attempt-empty rounded-lg border border-dashed px-3 py-2">Empty attempt</li>)}</ol></section>

        {game.status !== "playing" && <section className="game-card game-card--context p-5 text-center"><h2 className="text-2xl font-bold">{game.status === "won" ? "Solved!" : "Better luck tomorrow!"}</h2>{answer && <p className="mt-2">Today&apos;s entity was {answer}.</p>}<button type="button" onClick={shareResult} className="game-button game-button--secondary mt-4 px-4 py-2 font-semibold">Copy spoiler-free result</button></section>}

        <section className="game-card p-5"><div className="flex items-center justify-between gap-3"><h2 className="font-semibold">Local statistics</h2><button type="button" onClick={resetStats} className="muted-text text-sm underline hover:text-white">Reset</button></div><div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm"><div><strong className="block text-lg">{stats.gamesPlayed}</strong>Played</div><div><strong className="block text-lg">{winRate}%</strong>Win rate</div><div><strong className="block text-lg">{stats.currentStreak}</strong>Streak</div></div><div className="mt-4"><h3 className="text-sm font-medium">Win distribution</h3><ol className="mt-2 grid grid-cols-5 gap-2">{[1, 2, 3, 4, 5].map((round) => <li key={round} className="clue-card p-2 text-center text-xs"><strong className="block text-base">{stats.guessDistribution[String(round)] ?? 0}</strong>{round}</li>)}</ol></div></section>
      </div>
    </main>
  );
}
