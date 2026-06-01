import { NextRequest, NextResponse } from "next/server";
import {
  expandFootballPosition,
  normalizeBasketballPosition,
  normalizeFootballPosition,
  playerClubs,
  type PlayerOption,
  type PlayerSport
} from "@/lib/player-catalog";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

type EspnAthlete = {
  id?: string;
  displayName?: string;
  fullName?: string;
  headshot?: { href?: string };
  position?: { abbreviation?: string; displayName?: string; name?: string };
};

type EspnTeam = {
  id?: string;
  team?: {
    id?: string;
    displayName?: string;
    shortDisplayName?: string;
  };
};

type EspnTeams = {
  sports?: Array<{
    leagues?: Array<{
      teams?: EspnTeam[];
    }>;
  }>;
};

type EspnRoster = {
  athletes?: EspnAthlete[];
  team?: {
    athletes?: EspnAthlete[];
  };
};

const espnLeagueSlug: Record<string, string> = {
  "Premier League": "soccer/eng.1",
  LaLiga: "soccer/esp.1",
  "Ligue 1": "soccer/fra.1",
  Bundesliga: "soccer/ger.1",
  "Serie A": "soccer/ita.1",
  "World Cup": "soccer/fifa.world",
  NBA: "basketball/nba"
};

const requestTimeoutMs = 2800;

async function fetchJson<T>(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const response = await fetch(url, { next: { revalidate: 3600 }, signal: controller.signal });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function resolveEspnTeamId(league: string, clubName: string) {
  const slug = espnLeagueSlug[league];
  if (!slug) {
    return null;
  }

  const data = await fetchJson<EspnTeams>(`https://site.api.espn.com/apis/site/v2/sports/${slug}/teams`);
  const teams = data?.sports?.[0]?.leagues?.[0]?.teams ?? [];
  const normalizedClub = clubName.toLowerCase();
  const team = teams.find((item) => {
    const names = [item.team?.displayName, item.team?.shortDisplayName].filter(Boolean).map((value) => String(value).toLowerCase());
    return names.some((name) => name === normalizedClub || name.includes(normalizedClub) || normalizedClub.includes(name));
  });

  return team?.team?.id ?? team?.id ?? null;
}

async function fetchEspnRoster(sport: PlayerSport, league: string, clubName: string, position: string) {
  const slug = espnLeagueSlug[league];
  if (!slug) {
    return [];
  }

  const teamId = await resolveEspnTeamId(league, clubName);
  if (!teamId) {
    return [];
  }

  const data = await fetchJson<EspnRoster>(`https://site.api.espn.com/apis/site/v2/sports/${slug}/teams/${teamId}/roster`);
  const athletes = data?.athletes ?? data?.team?.athletes ?? [];
  const normalizedPosition = sport === "football" ? normalizeFootballPosition(position) : normalizeBasketballPosition(position);
  const expandedPositions = sport === "football" ? expandFootballPosition(position) : [normalizedPosition];

  return athletes
    .map((athlete): PlayerOption => {
      const positionName = athlete.position?.abbreviation ?? athlete.position?.displayName ?? athlete.position?.name ?? "";
      const nextPosition = sport === "football" ? normalizeFootballPosition(positionName) : normalizeBasketballPosition(positionName);
      return {
        id: `${clubName}-${athlete.id ?? athlete.displayName ?? athlete.fullName}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        name: athlete.displayName ?? athlete.fullName ?? "Unknown player",
        sport,
        club: clubName,
        league,
        position: nextPosition,
        positions: [nextPosition],
        image: athlete.headshot?.href
      };
    })
    .filter((player) => expandedPositions.includes(player.position) || player.positions.some((item) => expandedPositions.includes(item)));
}

function buildFallbackPlayers(clubName: string, league: string, sport: PlayerSport, position: string) {
  const knownFallbacks: Record<string, Record<string, string[]>> = {
    bournemouth: {
      GK: ["Kepa Arrizabalaga"],
      LB: ["Milos Kerkez"],
      CB: ["Illia Zabarnyi", "Marcos Senesi", "Dean Huijsen"],
      RB: ["Adam Smith", "Julian Araujo"],
      CM: ["Lewis Cook", "Ryan Christie", "Alex Scott", "Tyler Adams"],
      AM: ["Justin Kluivert", "Marcus Tavernier"],
      LW: ["Luis Sinisterra", "Dango Ouattara"],
      RW: ["Antoine Semenyo", "Marcus Tavernier"],
      ST: ["Evanilson", "Enes Unal", "Daniel Jebbison"]
    }
  };

  const normalizedPosition = sport === "football" ? normalizeFootballPosition(position) : normalizeBasketballPosition(position);
  const expandedPositions = sport === "football" ? expandFootballPosition(position) : [normalizedPosition];
  const clubFallback = knownFallbacks[clubName.toLowerCase()];
  const names = expandedPositions.flatMap((slot) => clubFallback?.[slot] ?? []);

  return names.map((name, index) => ({
    id: `${clubName}-${name}-${index}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name,
    sport,
    club: clubName,
    league,
    position: expandedPositions[Math.min(index, expandedPositions.length - 1)] ?? normalizedPosition,
    positions: expandedPositions
  })) satisfies PlayerOption[];
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const sport = (url.searchParams.get("sport") || "football") as PlayerSport;
  const clubId = url.searchParams.get("club") || "";
  const position = url.searchParams.get("position") || "";
  const club = playerClubs.find((item) => item.id === clubId && item.sport === sport);

  if (!club) {
    return NextResponse.json({ players: [] });
  }

  const remotePlayers = await fetchEspnRoster(sport, club.league, club.searchName ?? club.name, position);
  const seen = new Set<string>();
  const dedupedPlayers = remotePlayers.filter((player) => {
    const key = player.name.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
  const players = dedupedPlayers.length ? dedupedPlayers : buildFallbackPlayers(club.name, club.league, sport, position);

  return NextResponse.json({ players });
}
