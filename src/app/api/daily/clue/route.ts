import { NextResponse } from "next/server";
import { z } from "zod";
import { getDailyClues } from "@/lib/catalog";
import { getUtcDateKey } from "@/lib/daily-puzzle";

export const dynamic = "force-dynamic";

const QuerySchema = z.object({ dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), round: z.coerce.number().int().min(1).max(5) });

export function GET(request: Request) {
  const parsed = QuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success || parsed.data.dateKey !== getUtcDateKey(new Date())) return NextResponse.json({ error: "Invalid daily clue request." }, { status: 400 });
  const clue = getDailyClues(parsed.data.dateKey)[parsed.data.round - 1];
  return clue ? NextResponse.json({ clue: clue.text }) : NextResponse.json({ error: "Clue unavailable." }, { status: 404 });
}
