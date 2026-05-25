import { NextRequest, NextResponse } from "next/server";
import type { ArenaMatch, ArenaSport } from "@/lib/arena/types";
import { mockArenaMatches } from "@/lib/arena/mock";

export const dynamic = "force-dynamic";
export const revalidate = 45;

type SportsFeedEvent = {
  id: string;
  sport: ArenaSport;
  league: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  status: "upcoming" | "live" | "final";
  homeScore?: number;
  awayScore?: number;
};

function toArenaStatus(state?: string): ArenaMatch["status"] {
  if (state === "in") {
    return "live";
  }
  if (state === "post") {
    return "final";
  }
  return "upcoming";
}

async function fetchEspnFootball(origin: string): Promise<ArenaMatch[]> {
  try {
    const response = await fetch(`${origin}/api/sports/live`, { cache: "no-store" });
    if (!response.ok) {
      return [];
    }
    const data = (await response.json()) as {
      events?: Array<{
        id: string;
        sport: string;
        league: string;
        date: string;
        status: { state: string };
        homeTeam: { name: string; score?: string };
        awayTeam: { name: string; score?: string };
      }>;
    };

    return (data.events ?? [])
      .filter((event) => event.sport === "Football")
      .slice(0, 24)
      .map((event) => ({
        id: event.id,
        sport: "Football",
        league: event.league,
        homeTeam: event.homeTeam.name,
        awayTeam: event.awayTeam.name,
        startTime: event.date,
        status: toArenaStatus(event.status.state),
        homeScore: event.homeTeam.score ? Number(event.homeTeam.score) : undefined,
        awayScore: event.awayTeam.score ? Number(event.awayTeam.score) : undefined
      }));
  } catch {
    return [];
  }
}

async function fetchProviderMatches(): Promise<SportsFeedEvent[]> {
  const apiKey = process.env.API_SPORTS_KEY || process.env.SPORTSMONK_KEY;
  if (!apiKey) {
    return [];
  }

  return [];
}

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const providerMatches = await fetchProviderMatches();
  const footballMatches = await fetchEspnFootball(origin);
  const liveProviderMatches = [...providerMatches, ...footballMatches];
  const merged = liveProviderMatches.length ? liveProviderMatches : mockArenaMatches;
  const seen = new Set<string>();
  const twoDays = Date.now() + 2 * 24 * 60 * 60 * 1000;
  const matches = merged
    .filter((match) => {
      const time = new Date(match.startTime).getTime();
      return match.status === "live" || (time >= Date.now() - 30 * 60 * 1000 && time <= twoDays);
    })
    .filter((match) => {
      if (seen.has(match.id)) {
        return false;
      }
      seen.add(match.id);
      return true;
    })
    .sort((a, b) => Number(b.status === "live") - Number(a.status === "live") || new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    source: liveProviderMatches.length ? "provider" : "mock",
    matches
  });
}
