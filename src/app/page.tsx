import { GameBoard } from "@/features/game/game-board";
import { getDailyClues, getDailyTarget, searchEntities } from "@/lib/catalog";
import { getUtcDateKey } from "@/lib/daily-puzzle";

export const dynamic = "force-dynamic";

export default function Home() {
  const dateKey = getUtcDateKey(new Date());
  const target = getDailyTarget(dateKey);
  const clues = getDailyClues(dateKey);

  return (
    <GameBoard
      dateKey={dateKey}
      entities={searchEntities}
      entityContext={{ kind: target.kind, category: target.category }}
      initialClue={clues[0].text}
    />
  );
}
