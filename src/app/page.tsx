import { GameBoard } from "@/features/game/game-board";
import { getDailyTarget, searchEntities } from "@/lib/catalog";
import { getUtcDateKey } from "@/lib/daily-puzzle";

export const dynamic = "force-dynamic";

export default function Home() {
  const dateKey = getUtcDateKey(new Date());
  const target = getDailyTarget(dateKey);
  return <GameBoard dateKey={dateKey} entities={searchEntities} initialClue={target.clueCandidates[0].text} />;
}
