"use client";

import Fuse from "fuse.js";
import { useEffect, useMemo, useState } from "react";
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
    <main className="min-h-screen bg-stone-950 px-4 py-10 text-stone-100">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="text-center">
          <p className="text-xs font-bold tracking-[0.25em] text-emerald-400 uppercase">Daily challenge · {dateKey}</p>
          <h1 className="mt-2 text-4xl font-bold">Terraria Daily Guess</h1>
          <p className="mt-2 text-sm text-stone-400">Next daily challenge in <span aria-live="off">{formatTimeUntilNextUtcDay(new Date(now))}</span></p>
        </header>

        {message && <p role="status" className="rounded-lg border border-amber-400/50 bg-amber-950/30 px-3 py-2 text-sm text-amber-100">{message}</p>}

        <section className="rounded-2xl border border-emerald-500/40 bg-emerald-950/20 p-5 text-center" aria-label="Today&apos;s entity context">
          <p className="text-xs font-bold tracking-[0.2em] text-emerald-300 uppercase">Today&apos;s entity</p>
          <p className="mt-2 text-2xl font-bold capitalize">{entityContext.kind}</p>
          <p className="mt-1 text-sm text-stone-300 capitalize">{entityContext.category}</p>
        </section>

        <section className="rounded-2xl border border-stone-700 bg-stone-900 p-5" aria-labelledby="clues-heading">
          <h2 id="clues-heading" className="font-semibold">Clues</h2>
          <ol className="mt-3 space-y-2">{Array.from({ length: 5 }, (_, index) => <li key={index} className={`rounded-lg px-3 py-2 text-sm ${clues[index] ? "bg-stone-800" : "bg-stone-950 text-stone-600"}`}>{clues[index] ?? (clueLoading && index === clues.length ? "Loading next clue…" : `Round ${index + 1} unlocks after an incorrect guess.`)}</li>)}</ol>
        </section>

        <section className="rounded-2xl border border-stone-700 bg-stone-900 p-5">
          <label htmlFor="entity-search" className="font-semibold">Your guess</label>
          <div className="mt-3 flex gap-2"><input id="entity-search" value={query} disabled={game.status !== "playing"} onChange={(event) => { setQuery(event.target.value); setSelectedId(undefined); }} onKeyDown={(event) => { if (event.key === "Enter" && matches[0]) choose(matches[0]); }} placeholder="Search 5,000+ Terraria entities..." className="w-full rounded-lg border border-stone-600 bg-stone-950 px-3 py-2 outline-none focus:border-emerald-400" autoComplete="off" /><button type="button" onClick={guess} disabled={!selected || busy || game.status !== "playing"} className="rounded-lg bg-emerald-500 px-4 font-bold text-stone-950 disabled:cursor-not-allowed disabled:opacity-40">{busy ? "Checking…" : "Guess"}</button></div>
          {matches.length > 0 && <ul className="mt-2 overflow-hidden rounded-lg border border-stone-700" aria-label="Search results">{matches.map((entity) => <li key={entity.id}><button type="button" onClick={() => choose(entity)} className="flex w-full justify-between px-3 py-2 text-left hover:bg-stone-800"><span>{entity.name}</span><span className="text-xs text-stone-400">{entity.category}</span></button></li>)}</ul>}
        </section>

        <section className="rounded-2xl border border-stone-700 bg-stone-900 p-5"><h2 className="font-semibold">Attempts</h2><ol className="mt-3 space-y-2">{game.guesses.map((id) => <li key={id} className="rounded-lg bg-stone-800 px-3 py-2">{entities.find((entry) => entry.id === id)?.name}</li>)}{Array.from({ length: 5 - game.guesses.length }, (_, index) => <li key={`empty-${index}`} className="rounded-lg border border-dashed border-stone-700 px-3 py-2 text-stone-600">Empty attempt</li>)}</ol></section>

        {game.status !== "playing" && <section className="rounded-2xl border border-emerald-500/50 bg-emerald-950/30 p-5 text-center"><h2 className="text-2xl font-bold">{game.status === "won" ? "Solved!" : "Better luck tomorrow!"}</h2>{answer && <p className="mt-2">Today&apos;s entity was {answer}.</p>}<button type="button" onClick={shareResult} className="mt-4 rounded-lg bg-stone-100 px-4 py-2 font-semibold text-stone-950">Copy spoiler-free result</button></section>}

        <section className="rounded-2xl border border-stone-700 bg-stone-900 p-5"><div className="flex items-center justify-between gap-3"><h2 className="font-semibold">Local statistics</h2><button type="button" onClick={resetStats} className="text-sm text-stone-400 underline hover:text-stone-100">Reset</button></div><div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm"><div><strong className="block text-lg">{stats.gamesPlayed}</strong>Played</div><div><strong className="block text-lg">{winRate}%</strong>Win rate</div><div><strong className="block text-lg">{stats.currentStreak}</strong>Streak</div></div><div className="mt-4"><h3 className="text-sm font-medium">Win distribution</h3><ol className="mt-2 grid grid-cols-5 gap-2">{[1, 2, 3, 4, 5].map((round) => <li key={round} className="rounded bg-stone-800 p-2 text-center text-xs"><strong className="block text-base">{stats.guessDistribution[String(round)] ?? 0}</strong>{round}</li>)}</ol></div></section>
      </div>
    </main>
  );
}
