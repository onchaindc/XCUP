import { NextRequest, NextResponse } from "next/server";
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
  const origin = request.nextUrl.origin;

  if (!matchId) {
    return NextResponse.json({
      matchId,
      status: "unknown",
      result: null,
      updatedAt: new Date().toISOString()
    });
  }

  try {
    const [liveResponse, previousResponse] = await Promise.all([
      fetch(`${origin}/api/arena/matches`, { cache: "no-store" }),
      fetch(`${origin}/api/sports/previous`, { cache: "no-store" })
    ]);

    const liveData = liveResponse.ok ? ((await liveResponse.json()) as { matches?: Array<{ id: string; status: string; homeScore?: number; awayScore?: number }> }) : { matches: [] };
    const previousData = previousResponse.ok ? ((await previousResponse.json()) as { matches?: Array<{ id: string; homeTeam: { score?: string }; awayTeam: { score?: string } }> }) : { matches: [] };

    const liveMatch = liveData.matches?.find((item) => item.id === matchId);
    if (liveMatch) {
      const result = resultFromScore(liveMatch.homeScore, liveMatch.awayScore) ?? null;
      return NextResponse.json({
        matchId,
        status: liveMatch.status,
        result: liveMatch.status === "final" ? result : null,
        updatedAt: new Date().toISOString()
      });
    }

    const previousMatch = previousData.matches?.find((item) => item.id === matchId);
    if (previousMatch) {
      const homeScore = previousMatch.homeTeam.score ? Number(previousMatch.homeTeam.score) : undefined;
      const awayScore = previousMatch.awayTeam.score ? Number(previousMatch.awayTeam.score) : undefined;
      return NextResponse.json({
        matchId,
        status: "final",
        result: resultFromScore(homeScore, awayScore) ?? null,
        updatedAt: new Date().toISOString()
      });
    }
  } catch {
  }

  return NextResponse.json({
    matchId,
    status: "upcoming",
    result: resultFromScore(undefined, undefined) ?? null,
    updatedAt: new Date().toISOString()
  });
}
