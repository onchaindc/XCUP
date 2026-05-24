import { NextResponse } from "next/server";
import type { LiveSportEvent, LiveSportsResponse } from "@/lib/sports";

export const dynamic = "force-dynamic";
export const revalidate = 45;

const feeds = [
  { sport: "Football", league: "FIFA World Cup", slug: "soccer/fifa.world", priority: 140 },
  { sport: "Football", league: "FIFA Club World Cup", slug: "soccer/fifa.cwc", priority: 132 },
  { sport: "Football", league: "UEFA Champions League", slug: "soccer/uefa.champions", priority: 126 },
  { sport: "Football", league: "Premier League", slug: "soccer/eng.1", priority: 122 },
  { sport: "Football", league: "LaLiga", slug: "soccer/esp.1", priority: 116 },
  { sport: "Football", league: "Serie A", slug: "soccer/ita.1", priority: 110 },
  { sport: "Football", league: "Bundesliga", slug: "soccer/ger.1", priority: 108 },
  { sport: "Football", league: "Ligue 1", slug: "soccer/fra.1", priority: 104 },
  { sport: "Football", league: "Eredivisie", slug: "soccer/ned.1", priority: 103 },
  { sport: "Football", league: "Europa League", slug: "soccer/uefa.europa", priority: 100 },
  { sport: "Football", league: "MLS", slug: "soccer/usa.1", priority: 94 },
  { sport: "Football", league: "Liga MX", slug: "soccer/mex.1", priority: 92 },
  { sport: "Football", league: "Copa America", slug: "soccer/conmebol.america", priority: 90 },
  { sport: "Basketball", league: "NBA", slug: "basketball/nba", priority: 88 },
  { sport: "Basketball", league: "WNBA", slug: "basketball/wnba", priority: 76 },
  { sport: "Basketball", league: "NCAAM", slug: "basketball/mens-college-basketball", priority: 70 },
  { sport: "Cricket", league: "Cricket", slug: "cricket", priority: 84 },
  { sport: "American Football", league: "NFL", slug: "football/nfl", priority: 80 },
  { sport: "American Football", league: "College Football", slug: "football/college-football", priority: 62 },
  { sport: "Baseball", league: "MLB", slug: "baseball/mlb", priority: 66 },
  { sport: "Hockey", league: "NHL", slug: "hockey/nhl", priority: 64 },
  { sport: "Tennis", league: "ATP", slug: "tennis/atp", priority: 58 },
  { sport: "Tennis", league: "WTA", slug: "tennis/wta", priority: 56 },
  { sport: "MMA", league: "UFC", slug: "mma/ufc", priority: 48 }
];

const priorityClubs = ["real madrid", "barcelona", "arsenal", "manchester city", "madrid", "barca", "city", "ajax"];
const FEED_TIMEOUT_MS = 3500;

type EspnTeam = {
  id?: string;
  homeAway?: "home" | "away";
  score?: string;
  team?: {
    id?: string;
    displayName?: string;
    shortDisplayName?: string;
    name?: string;
    abbreviation?: string;
    logo?: string;
  };
};

type EspnEvent = {
  id?: string;
  name?: string;
  shortName?: string;
  date?: string;
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
  links?: Array<{ href?: string; rel?: string[]; text?: string }>;
  competitions?: Array<{
    competitors?: EspnTeam[];
  }>;
};

type EspnScoreboard = {
  events?: EspnEvent[];
};

function teamFrom(competitor?: EspnTeam) {
  const team = competitor?.team;
  return {
    id: team?.id ?? competitor?.id,
    name: team?.displayName ?? team?.name ?? "TBD",
    shortName: team?.shortDisplayName ?? team?.abbreviation ?? team?.name ?? "TBD",
    logo: team?.logo,
    score: competitor?.score
  };
}

function matchupName(away: ReturnType<typeof teamFrom>, home: ReturnType<typeof teamFrom>) {
  return `${away.shortName} VS ${home.shortName}`;
}

function normalizeMatchupText(value: string) {
  return value.replace(/\s+@\s+|\s+at\s+/gi, " VS ");
}

function normalizeEvent(event: EspnEvent, feed: (typeof feeds)[number]): LiveSportEvent | null {
  const competitors = event.competitions?.[0]?.competitors ?? [];
  const home = competitors.find((item) => item.homeAway === "home") ?? competitors[0];
  const away = competitors.find((item) => item.homeAway === "away") ?? competitors[1];
  if (!event.id || !home || !away) {
    return null;
  }

  const homeTeam = teamFrom(home);
  const awayTeam = teamFrom(away);
  const state = event.status?.type?.state ?? "unknown";
  const liveBoost = state === "in" ? 20 : 0;
  const scheduledBoost = state === "pre" ? 6 : 0;
  const text = `${event.name ?? ""} ${event.shortName ?? ""} ${homeTeam.name} ${awayTeam.name}`.toLowerCase();
  const clubBoost = priorityClubs.reduce((boost, club) => boost + (text.includes(club) ? 10 : 0), 0);
  return {
    id: `${feed.slug}:${event.id}`,
    sport: feed.sport,
    league: feed.league,
    priority: feed.priority + liveBoost + scheduledBoost + clubBoost,
    name: normalizeMatchupText(event.name ?? `${awayTeam.name} VS ${homeTeam.name}`),
    shortName: normalizeMatchupText(event.shortName ?? matchupName(awayTeam, homeTeam)),
    date: event.date ?? new Date().toISOString(),
    status: {
      state,
      detail: event.status?.type?.shortDetail ?? event.status?.type?.detail ?? event.status?.type?.description ?? "Scheduled",
      clock: event.status?.displayClock ?? ""
    },
    venue: event.venue?.displayName,
    homeTeam,
    awayTeam,
    link: event.links?.find((link) => link.href)?.href
  };
}

async function fetchScoreboard(feed: (typeof feeds)[number]) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FEED_TIMEOUT_MS);

  try {
    const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${feed.slug}/scoreboard`, {
      next: { revalidate: 45 },
      signal: controller.signal
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as EspnScoreboard;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchFeed(feed: (typeof feeds)[number]) {
  const data = await fetchScoreboard(feed);
  if (!data) {
    return [];
  }

  return (data.events ?? [])
    .map((event) => normalizeEvent(event, feed))
    .filter((event): event is LiveSportEvent => Boolean(event));
}

export async function GET() {
  const settled = await Promise.allSettled(feeds.map(fetchFeed));
  const seen = new Set<string>();
  const now = Date.now();
  const soon = now + 72 * 60 * 60 * 1000;
  const events = settled
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .filter((event) => {
      if (event.status.state === "in") {
        return true;
      }
      const eventTime = new Date(event.date).getTime();
      return event.status.state === "pre" && eventTime >= now - 30 * 60 * 1000 && eventTime <= soon;
    })
    .filter((event) => {
      if (seen.has(event.id)) {
        return false;
      }
      seen.add(event.id);
      return true;
    })
    .sort((a, b) => {
      const liveSort = Number(b.status.state === "in") - Number(a.status.state === "in");
      if (liveSort) {
        return liveSort;
      }
      return b.priority - a.priority || new Date(a.date).getTime() - new Date(b.date).getTime();
    })
    .slice(0, 120);

  const body: LiveSportsResponse = {
    generatedAt: new Date().toISOString(),
    scanned: feeds.map((feed) => feed.league),
    events
  };

  return NextResponse.json(body);
}
