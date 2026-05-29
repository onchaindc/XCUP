import { NextResponse } from "next/server";
import type { PreviousFootballMatch, PreviousFootballResponse } from "@/lib/sports";

export const dynamic = "force-dynamic";
export const revalidate = 60;

const footballFeeds = [
  { league: "FIFA World Cup", slug: "soccer/fifa.world", priority: 140 },
  { league: "FIFA Club World Cup", slug: "soccer/fifa.cwc", priority: 132 },
  { league: "International Friendlies", slug: "soccer/fifa.friendly", priority: 130 },
  { league: "UEFA Champions League", slug: "soccer/uefa.champions", priority: 126 },
  { league: "Premier League", slug: "soccer/eng.1", priority: 122 },
  { league: "LaLiga", slug: "soccer/esp.1", priority: 116 },
  { league: "Serie A", slug: "soccer/ita.1", priority: 110 },
  { league: "Bundesliga", slug: "soccer/ger.1", priority: 108 },
  { league: "Ligue 1", slug: "soccer/fra.1", priority: 104 }
] as const;

type EspnCompetitor = {
  id?: string;
  homeAway?: "home" | "away";
  score?: string;
  statistics?: Array<{ name?: string; displayName?: string; label?: string; displayValue?: string; value?: number | string }>;
  team?: {
    id?: string;
    displayName?: string;
    shortDisplayName?: string;
    abbreviation?: string;
    logo?: string;
  };
};

type EspnEvent = {
  id?: string;
  date?: string;
  name?: string;
  shortName?: string;
  venue?: { displayName?: string };
  status?: {
    displayClock?: string;
    type?: {
      state?: string;
      detail?: string;
      shortDetail?: string;
      description?: string;
    };
  };
  competitions?: Array<{
    competitors?: EspnCompetitor[];
    details?: Array<{
      id?: string;
      clock?: { displayValue?: string };
      team?: { displayName?: string; abbreviation?: string };
      athletesInvolved?: Array<{ displayName?: string; fullName?: string }>;
      scoringPlay?: boolean;
      scoreValue?: number;
      homeScore?: number;
      awayScore?: number;
      text?: string;
    }>;
  }>;
};

type EspnSummary = {
  boxscore?: {
    teams?: Array<{
      team?: { id?: string };
      statistics?: Array<{ name?: string; displayName?: string; label?: string; displayValue?: string; value?: number | string }>;
    }>;
  };
  scoringPlays?: Array<{
    id?: string;
    clock?: { displayValue?: string };
    team?: { displayName?: string; abbreviation?: string };
    athletesInvolved?: Array<{ displayName?: string; fullName?: string }>;
    text?: string;
    homeScore?: number;
    awayScore?: number;
  }>;
};

function dateRange() {
  const end = new Date();
  const start = new Date(end.getTime() - 2 * 24 * 60 * 60 * 1000);
  const format = (date: Date) =>
    `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`;
  return `${format(start)}-${format(end)}`;
}

async function fetchJson<T>(url: string) {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function teamFrom(competitor?: EspnCompetitor) {
  return {
    id: competitor?.team?.id ?? competitor?.id,
    name: competitor?.team?.displayName ?? "TBD",
    shortName: competitor?.team?.shortDisplayName ?? competitor?.team?.abbreviation ?? "TBD",
    logo: competitor?.team?.logo,
    score: competitor?.score
  };
}

function normalizeStats(home?: EspnCompetitor, away?: EspnCompetitor, summary?: EspnSummary) {
  const homeStats = home?.statistics ?? summary?.boxscore?.teams?.find((item) => item.team?.id === home?.team?.id)?.statistics ?? [];
  const awayStats = away?.statistics ?? summary?.boxscore?.teams?.find((item) => item.team?.id === away?.team?.id)?.statistics ?? [];
  const awayByName = new Map(awayStats.map((stat) => [stat.name ?? stat.displayName ?? stat.label ?? "", stat]));
  return homeStats
    .map((homeStat) => {
      const key = homeStat.name ?? homeStat.displayName ?? homeStat.label ?? "";
      const awayStat = awayByName.get(key);
      return {
        label: homeStat.displayName ?? homeStat.label ?? key,
        home: String(homeStat.displayValue ?? homeStat.value ?? "-"),
        away: String(awayStat?.displayValue ?? awayStat?.value ?? "-")
      };
    })
    .filter((stat) => stat.label && (stat.home !== "-" || stat.away !== "-"));
}

function normalizeGoals(event?: EspnEvent, summary?: EspnSummary) {
  const plays = summary?.scoringPlays ?? event?.competitions?.[0]?.details?.filter((detail) => detail.scoringPlay || detail.scoreValue) ?? [];
  return plays.map((play, index) => ({
    id: play.id ?? `${index}`,
    team: play.team?.displayName ?? play.team?.abbreviation,
    athlete: play.athletesInvolved?.[0]?.displayName ?? play.athletesInvolved?.[0]?.fullName,
    minute: play.clock?.displayValue,
    text: play.text ?? "Scoring play",
    score: typeof play.homeScore === "number" && typeof play.awayScore === "number" ? `${play.awayScore}-${play.homeScore}` : undefined
  }));
}

export async function GET() {
  const dates = dateRange();
  const feedResults = await Promise.all(
    footballFeeds.map(async (feed) => {
      const scoreboard = await fetchJson<{ events?: EspnEvent[] }>(`https://site.api.espn.com/apis/site/v2/sports/${feed.slug}/scoreboard?dates=${dates}&limit=100`);
      const finished = (scoreboard?.events ?? []).filter((event) => event.status?.type?.state === "post");
      const matches = await Promise.all(
        finished.map(async (event) => {
          const summary = event.id ? await fetchJson<EspnSummary>(`https://site.api.espn.com/apis/site/v2/sports/${feed.slug}/summary?event=${encodeURIComponent(event.id)}`) : null;
          const competitors = event.competitions?.[0]?.competitors ?? [];
          const home = competitors.find((item) => item.homeAway === "home") ?? competitors[0];
          const away = competitors.find((item) => item.homeAway === "away") ?? competitors[1];
          if (!event.id || !home || !away) return null;
          const match: PreviousFootballMatch = {
            id: `${feed.slug}:${event.id}`,
            league: feed.league,
            date: event.date ?? new Date().toISOString(),
            venue: event.venue?.displayName,
            homeTeam: teamFrom(home),
            awayTeam: teamFrom(away),
            status: {
              state: event.status?.type?.state ?? "post",
              detail: event.status?.type?.shortDetail ?? event.status?.type?.detail ?? event.status?.type?.description ?? "Final",
              clock: event.status?.displayClock ?? ""
            },
            stats: normalizeStats(home, away, summary ?? undefined),
            goals: normalizeGoals(event, summary ?? undefined)
          };
          return match;
        })
      );
      return matches.filter((match): match is PreviousFootballMatch => Boolean(match));
    })
  );

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    matches: feedResults.flat().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  } satisfies PreviousFootballResponse);
}
