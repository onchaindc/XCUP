import { NextRequest, NextResponse } from "next/server";
import type { LiveMatchDetails, LiveMatchPlayer, LiveMatchStat, LiveMatchSubstitution, LiveSportEvent } from "@/lib/sports";

export const dynamic = "force-dynamic";
export const revalidate = 20;

const FEED_TIMEOUT_MS = 4500;

type EspnCompetitor = {
  id?: string;
  homeAway?: "home" | "away";
  score?: string;
  statistics?: Array<{ name?: string; displayName?: string; label?: string; displayValue?: string; value?: number | string }>;
  lineup?: Array<EspnPlayer>;
  roster?: Array<EspnPlayer>;
  team?: {
    id?: string;
    displayName?: string;
    shortDisplayName?: string;
    abbreviation?: string;
    logo?: string;
    coach?: { displayName?: string; name?: string };
    coaches?: Array<{ displayName?: string; name?: string }>;
  };
  coach?: { displayName?: string; name?: string };
  coaches?: Array<{ displayName?: string; name?: string }>;
};

type EspnPlayer = {
  starter?: boolean;
  position?: { abbreviation?: string; displayName?: string };
  athlete?: {
    id?: string;
    displayName?: string;
    fullName?: string;
    jersey?: string;
    position?: { abbreviation?: string; displayName?: string };
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
  competitions?: Array<{
    competitors?: EspnCompetitor[];
    details?: Array<{
      id?: string;
      clock?: { displayValue?: string };
      team?: { displayName?: string; abbreviation?: string };
      athletesInvolved?: Array<{ displayName?: string; fullName?: string }>;
      participants?: Array<{ athlete?: { displayName?: string; fullName?: string }; displayName?: string; fullName?: string }>;
      scoringPlay?: boolean;
      scoreValue?: number;
      homeScore?: number;
      awayScore?: number;
      type?: { text?: string };
      text?: string;
    }>;
  }>;
};

type EspnSummary = {
  header?: {
    competitions?: Array<{
      competitors?: EspnCompetitor[];
    }>;
  };
  gameInfo?: {
    venue?: { fullName?: string };
  };
  boxscore?: {
    teams?: Array<{
      team?: { id?: string; displayName?: string; coach?: { displayName?: string; name?: string }; coaches?: Array<{ displayName?: string; name?: string }> };
      statistics?: Array<{ name?: string; displayName?: string; label?: string; displayValue?: string; value?: number | string }>;
      coach?: { displayName?: string; name?: string };
      coaches?: Array<{ displayName?: string; name?: string }>;
    }>;
    form?: Array<{ team?: { id?: string }; formation?: string }>;
  };
  rosters?: Array<{
    team?: { id?: string; displayName?: string };
    roster?: EspnPlayer[];
  }>;
  scoringPlays?: Array<{
    id?: string;
    clock?: { displayValue?: string };
    team?: { displayName?: string; abbreviation?: string };
    athletesInvolved?: Array<{ displayName?: string; fullName?: string }>;
    participants?: Array<{ athlete?: { displayName?: string; fullName?: string }; displayName?: string; fullName?: string }>;
    text?: string;
    homeScore?: number;
    awayScore?: number;
    type?: { text?: string };
  }>;
  drives?: Array<{
    plays?: Array<{
      id?: string;
      clock?: { displayValue?: string };
      team?: { displayName?: string; abbreviation?: string };
      athletesInvolved?: Array<{ displayName?: string; fullName?: string }>;
      participants?: Array<{ athlete?: { displayName?: string; fullName?: string }; displayName?: string; fullName?: string }>;
      type?: { text?: string };
      text?: string;
    }>;
  }>;
};

function splitEventId(id: string) {
  const separator = id.lastIndexOf(":");
  if (separator < 1) return null;
  return {
    slug: id.slice(0, separator),
    eventId: id.slice(separator + 1)
  };
}

function espnDateRange(daysBack = 2, daysForward = 2) {
  const now = new Date();
  const start = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
  const end = new Date(now.getTime() + daysForward * 24 * 60 * 60 * 1000);
  const format = (date: Date) =>
    `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`;
  return `${format(start)}-${format(end)}`;
}

async function fetchJson<T>(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FEED_TIMEOUT_MS);
  try {
    const response = await fetch(url, { cache: "no-store", signal: controller.signal });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchEvent(slug: string, eventId: string) {
  const direct = await fetchJson<{ events?: EspnEvent[] }>(`https://site.api.espn.com/apis/site/v2/sports/${slug}/scoreboard?event=${encodeURIComponent(eventId)}&limit=1`);
  const directEvent = direct?.events?.find((item) => item.id === eventId) ?? direct?.events?.[0];
  if (directEvent?.id === eventId) {
    return directEvent;
  }

  const dated = await fetchJson<{ events?: EspnEvent[] }>(`https://site.api.espn.com/apis/site/v2/sports/${slug}/scoreboard?dates=${espnDateRange()}&limit=200`);
  return dated?.events?.find((item) => item.id === eventId) ?? directEvent;
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

function eventFrom(id: string, slug: string, event: EspnEvent): LiveSportEvent | undefined {
  const competitors = event.competitions?.[0]?.competitors ?? [];
  const home = competitors.find((item) => item.homeAway === "home") ?? competitors[0];
  const away = competitors.find((item) => item.homeAway === "away") ?? competitors[1];
  if (!home || !away) return undefined;

  return {
    id,
    sport: slug.split("/")[0] ?? "Sports",
    league: slug.split("/")[1] ?? "Live",
    priority: 0,
    name: event.name ?? event.shortName ?? "Live match",
    shortName: event.shortName ?? event.name ?? "Live match",
    date: event.date ?? new Date().toISOString(),
    status: {
      state: event.status?.type?.state ?? "unknown",
      detail: event.status?.type?.shortDetail ?? event.status?.type?.detail ?? event.status?.type?.description ?? "Live",
      clock: event.status?.displayClock ?? ""
    },
    venue: event.venue?.displayName,
    homeTeam: teamFrom(home),
    awayTeam: teamFrom(away)
  };
}

function normalizeStats(home?: EspnCompetitor, away?: EspnCompetitor, summary?: EspnSummary): LiveMatchStat[] {
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

function fallbackScoreStats(home?: EspnCompetitor, away?: EspnCompetitor): LiveMatchStat[] {
  const stats: LiveMatchStat[] = [];
  if (home?.score || away?.score) {
    stats.push({ label: "Score", home: home?.score ?? "-", away: away?.score ?? "-" });
  }
  return stats;
}

function playerFrom(item: EspnPlayer): LiveMatchPlayer {
  return {
    id: item.athlete?.id,
    name: item.athlete?.displayName ?? item.athlete?.fullName ?? "Player",
    position: item.position?.abbreviation ?? item.athlete?.position?.abbreviation ?? item.position?.displayName ?? item.athlete?.position?.displayName,
    jersey: item.athlete?.jersey,
    starter: item.starter
  };
}

function coachFrom(competitor?: EspnCompetitor, summary?: EspnSummary) {
  const teamSummary = summary?.boxscore?.teams?.find((item) => item.team?.id === competitor?.team?.id);
  const coach =
    competitor?.coach ??
    competitor?.coaches?.[0] ??
    competitor?.team?.coach ??
    competitor?.team?.coaches?.[0] ??
    teamSummary?.coach ??
    teamSummary?.coaches?.[0] ??
    teamSummary?.team?.coach ??
    teamSummary?.team?.coaches?.[0];
  return coach?.displayName ?? coach?.name;
}

function normalizeLineups(competitors: EspnCompetitor[], summary?: EspnSummary) {
  return competitors.map((competitor) => {
    const roster = competitor.lineup ?? competitor.roster ?? summary?.rosters?.find((item) => item.team?.id === competitor.team?.id)?.roster ?? [];
    const formation = summary?.boxscore?.form?.find((item) => item.team?.id === competitor.team?.id)?.formation;
    const players = roster.map(playerFrom);
    return {
      team: competitor.team?.displayName ?? "Team",
      formation,
      coach: coachFrom(competitor, summary),
      starters: players.filter((player) => player.starter).slice(0, 11),
      substitutes: players.filter((player) => !player.starter).slice(0, 12)
    };
  });
}

function participantName(participant?: { athlete?: { displayName?: string; fullName?: string }; displayName?: string; fullName?: string }) {
  return participant?.athlete?.displayName ?? participant?.athlete?.fullName ?? participant?.displayName ?? participant?.fullName;
}

function normalizeGoals(event?: EspnEvent, summary?: EspnSummary) {
  const plays = summary?.scoringPlays ?? event?.competitions?.[0]?.details?.filter((detail) => detail.scoringPlay || detail.scoreValue) ?? [];
  return plays.map((play, index) => ({
    id: play.id ?? `${index}`,
    team: play.team?.displayName ?? play.team?.abbreviation,
    athlete: play.athletesInvolved?.[0]?.displayName ?? play.athletesInvolved?.[0]?.fullName,
    minute: play.clock?.displayValue,
    text: play.text ?? "Scoring play",
    score: typeof play.homeScore === "number" && typeof play.awayScore === "number" ? `${play.awayScore}-${play.homeScore}` : undefined,
    penalty: /penalty|spot kick/i.test(`${play.type?.text ?? ""} ${play.text ?? ""}`)
  }));
}

function normalizeSubstitutions(event?: EspnEvent, summary?: EspnSummary): LiveMatchSubstitution[] {
  const detailPlays = event?.competitions?.[0]?.details ?? [];
  const drivePlays = summary?.drives?.flatMap((drive) => drive.plays ?? []) ?? [];
  return [...detailPlays, ...drivePlays]
    .filter((play) => /substitution|substitute|subbed/i.test(`${play.type?.text ?? ""} ${play.text ?? ""}`))
    .map((play, index) => {
      const names = [
        play.athletesInvolved?.[0]?.displayName ?? play.athletesInvolved?.[0]?.fullName,
        play.athletesInvolved?.[1]?.displayName ?? play.athletesInvolved?.[1]?.fullName,
        participantName(play.participants?.[0]),
        participantName(play.participants?.[1])
      ].filter(Boolean) as string[];

      return {
        id: play.id ?? `${index}`,
        team: play.team?.displayName ?? play.team?.abbreviation,
        minute: play.clock?.displayValue,
        playerIn: names[0],
        playerOut: names[1],
        text: play.text ?? "Substitution"
      };
    });
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? "";
  const parts = splitEventId(id);
  if (!parts) {
    return NextResponse.json({ error: "Missing live match id." }, { status: 400 });
  }

  const event = await fetchEvent(parts.slug, parts.eventId);
  const normalizedEvent = event ? eventFrom(id, parts.slug, event) : undefined;

  if (!event || normalizedEvent?.status.state !== "in") {
    return NextResponse.json(
      {
        id,
        generatedAt: new Date().toISOString(),
        source: "ESPN live scoreboard",
        available: false,
        message: "Full match details are only available for matches that are currently live.",
        event: normalizedEvent,
        stats: [],
        goals: [],
        substitutions: [],
        lineups: []
      } satisfies LiveMatchDetails,
      { status: 409 }
    );
  }

  const summary = await fetchJson<EspnSummary>(`https://site.api.espn.com/apis/site/v2/sports/${parts.slug}/summary?event=${encodeURIComponent(parts.eventId)}`);
  const safeSummary = summary ?? undefined;
  const competitors = safeSummary?.header?.competitions?.[0]?.competitors ?? event.competitions?.[0]?.competitors ?? [];
  const home = competitors.find((item) => item.homeAway === "home") ?? competitors[0];
  const away = competitors.find((item) => item.homeAway === "away") ?? competitors[1];

  return NextResponse.json({
    id,
    generatedAt: new Date().toISOString(),
    source: "ESPN live summary",
    available: true,
    event: normalizedEvent,
    stats: (() => {
      const stats = normalizeStats(home, away, safeSummary);
      return stats.length ? stats : fallbackScoreStats(home, away);
    })(),
    goals: normalizeGoals(event, safeSummary),
    substitutions: normalizeSubstitutions(event, safeSummary),
    lineups: normalizeLineups(competitors, safeSummary)
  } satisfies LiveMatchDetails);
}
