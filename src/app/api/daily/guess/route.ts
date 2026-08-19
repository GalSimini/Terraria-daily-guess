import { NextResponse } from "next/server";
import { z } from "zod";
import { getCatalogEntity, getDailyTarget } from "@/lib/catalog";
import { getUtcDateKey } from "@/lib/daily-puzzle";

export const dynamic = "force-dynamic";

const GuessSchema = z.object({ dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), guessId: z.string().min(1), attemptCount: z.number().int().min(1).max(5) });

export async function POST(request: Request) {
  const parsed = GuessSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.dateKey !== getUtcDateKey(new Date())) return NextResponse.json({ error: "Invalid daily guess." }, { status: 400 });
  if (!getCatalogEntity(parsed.data.guessId)) return NextResponse.json({ error: "Unknown entity." }, { status: 400 });
  const target = getDailyTarget(parsed.data.dateKey);
  const correct = parsed.data.guessId === target.id;
  return NextResponse.json({ correct, answer: !correct && parsed.data.attemptCount === 5 ? { id: target.id, name: target.name } : undefined });
}
