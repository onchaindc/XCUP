import { NextRequest, NextResponse } from "next/server";
import { mockArenaMatches } from "@/lib/arena/mock";
import type { ArenaOutcome } from "@/lib/arena/types";

export const dynamic = "force-dynamic";

function resultFromScore(homeScore?: number, awayScore?: number): ArenaOutcome | undefined {
  if (homeScore === undefined || awayScore === undefined) {
    return undefined;
  }
  if (homeScore === awayScore) {
    return "DRAW";
  }
  return homeScore > awayScore ? "HOME" : "AWAY";
}

export async function GET(request: NextRequest) {
  const matchId = request.nextUrl.searchParams.get("matchId");
  const match = mockArenaMatches.find((item) => item.id === matchId);

  return NextResponse.json({
    matchId,
    status: match?.status ?? "upcoming",
    result: resultFromScore(match?.homeScore, match?.awayScore) ?? null,
    updatedAt: new Date().toISOString()
  });
}
