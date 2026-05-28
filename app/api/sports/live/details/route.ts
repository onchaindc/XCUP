import { NextRequest, NextResponse } from "next/server";
import type { LiveMatchDetails, LiveMatchLineup, LiveMatchPlayerEvent, LiveMatchStat } from "@/lib/sports";

export const dynamic = "force-dynamic";
export const revalidate = 30;

const SUMMARY_TIMEOUT_MS = 4500;

type JsonObject = Record<string, unknown>;

function objectFrom(value: unknown): JsonObject {
  return value && typeof value === "object" ? (value as JsonObject) : {};
}

function arrayFrom(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringFrom(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function nestedString(value: JsonObject, path: string[], fallback = "") {
  let cursor: unknown = value;
  for (const key of path) {
    cursor = objectFrom(cursor)[key];
  }
  return stringFrom(cursor, fallback);
}

function scoreSide(teamEntry: JsonObject) {
  const team = objectFrom(teamEntry.team);
  return {
    id: stringFrom(team.id, stringFrom(teamEntry.id)),
    name: stringFrom(team.shortDisplayName, stringFrom(team.displayName, stringFrom(team.name, "Team"))),
    homeAway: stringFrom(teamEntry.homeAway),
    score: stringFrom(teamEntry.score, "0")
  };
}

function statLabel(stat: JsonObject) {
  return stringFrom(stat.displayName, stringFrom(stat.label, stringFrom(stat.name, "Stat")));
}

function statValue(stat: JsonObject) {
  const display = stringFrom(stat.displayValue);
  if (display) {
    return display;
  }
  const value = stat.value;
  return typeof value === "number" ? String(value) : stringFrom(value, "-");
}

function normalizeTeamStats(summary: JsonObject): LiveMatchStat[] {
  const competition = objectFrom(arrayFrom(objectFrom(summary.header).competitions)[0]);
  const competitors = arrayFrom(competition.competitors).map(objectFrom);
  const home = competitors.find((item) => stringFrom(item.homeAway) === "home") ?? competitors[0] ?? {};
  const away = competitors.find((item) => stringFrom(item.homeAway) === "away") ?? competitors[1] ?? {};
  const homeTeam = scoreSide(home);
  const awayTeam = scoreSide(away);
  const byLabel = new Map<string, LiveMatchStat>();

  for (const competitor of [away, home]) {
    const side = scoreSide(competitor);
    for (const stat of arrayFrom(competitor.statistics).map(objectFrom)) {
      const label = statLabel(stat);
      const current = byLabel.get(label) ?? { label, away: "-", home: "-" };
      if (side.homeAway === "home" || side.id === homeTeam.id || side.name === homeTeam.name) {
        current.home = statValue(stat);
      } else {
        current.away = statValue(stat);
      }
      byLabel.set(label, current);
    }
  }

  const boxTeams = arrayFrom(objectFrom(summary.boxscore).teams).map(objectFrom);
  for (const boxTeam of boxTeams) {
    const side = scoreSide(boxTeam);
    for (const stat of arrayFrom(boxTeam.statistics).map(objectFrom)) {
      const label = statLabel(stat);
      const current = byLabel.get(label) ?? { label, away: "-", home: "-" };
      if (side.homeAway === "home" || side.id === homeTeam.id || side.name === homeTeam.name) {
        current.home = statValue(stat);
      } else {
        current.away = statValue(stat);
      }
      byLabel.set(label, current);
    }
  }

  const preferred = ["Possession", "Shots on Goal", "Total Shots", "Corner Kicks", "Corners", "Fouls", "Yellow Cards", "Red Cards", "Saves", "Passes"];
  const stats = Array.from(byLabel.values());
  return [
    ...preferred.flatMap((label) => stats.filter((stat) => stat.label.toLowerCase() === label.toLowerCase())),
    ...stats.filter((stat) => !preferred.some((label) => label.toLowerCase() === stat.label.toLowerCase()))
  ];
}

function participantName(participant: unknown) {
  const item = objectFrom(participant);
  const athlete = objectFrom(item.athlete);
  return stringFrom(athlete.displayName, stringFrom(item.displayName, stringFrom(item.name)));
}

function normalizeScoringPlays(summary: JsonObject): LiveMatchPlayerEvent[] {
  return arrayFrom(summary.scoringPlays).map((play, index) => {
    const item = objectFrom(play);
    const participants = arrayFrom(item.participants);
    const scorer = participantName(participants[0]) || nestedString(item, ["athlete", "displayName"], "Unknown scorer");
    const assist = participantName(participants.find((participant) => {
      const type = stringFrom(objectFrom(participant).type).toLowerCase();
      return type.includes("assist");
    }) ?? participants[1]);
    return {
      id: stringFrom(item.id, `goal-${index}`),
      minute: nestedString(item, ["clock", "displayValue"], stringFrom(item.period, "")),
      team: nestedString(item, ["team", "shortDisplayName"], nestedString(item, ["team", "displayName"], "")),
      player: scorer,
      assist: assist && assist !== scorer ? assist : undefined,
      type: "goal",
      detail: stringFrom(item.text)
    };
  });
}

function normalizePlays(summary: JsonObject, keyword: string, type: LiveMatchPlayerEvent["type"]): LiveMatchPlayerEvent[] {
  return arrayFrom(summary.plays)
    .map(objectFrom)
    .filter((play) => stringFrom(play.text).toLowerCase().includes(keyword))
    .slice(0, 20)
    .map((play, index) => ({
      id: stringFrom(play.id, `${type}-${index}`),
      minute: nestedString(play, ["clock", "displayValue"], stringFrom(play.period, "")),
      team: nestedString(play, ["team", "shortDisplayName"], nestedString(play, ["team", "displayName"], "")),
      player: participantName(arrayFrom(play.participants)[0]) || stringFrom(play.text, "Match event"),
      type,
      detail: stringFrom(play.text)
    }));
}

function normalizeLineups(summary: JsonObject): LiveMatchLineup[] {
  return arrayFrom(objectFrom(summary.boxscore).players).map((entry) => {
    const item = objectFrom(entry);
    const team = objectFrom(item.team);
    const starters = new Set<string>();
    const substitutes = new Set<string>();

    for (const group of arrayFrom(item.statistics).map(objectFrom)) {
      for (const athleteEntry of arrayFrom(group.athletes).map(objectFrom)) {
        const athlete = objectFrom(athleteEntry.athlete);
        const name = stringFrom(athlete.displayName, stringFrom(athlete.shortName));
        if (!name) {
          continue;
        }
        const starter = athleteEntry.starter === true || stringFrom(athleteEntry.starter).toLowerCase() === "true";
        if (starter) {
          starters.add(name);
        } else {
          substitutes.add(name);
        }
      }
    }

    return {
      team: stringFrom(team.shortDisplayName, stringFrom(team.displayName, "Team")),
      starters: Array.from(starters).slice(0, 11),
      substitutes: Array.from(substitutes).slice(0, 12)
    };
  }).filter((lineup) => lineup.starters.length || lineup.substitutes.length);
}

async function fetchSummary(slug: string, eventId: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SUMMARY_TIMEOUT_MS);
  try {
    const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${slug}/summary?event=${eventId}`, {
      next: { revalidate: 30 },
      signal: controller.signal
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as JsonObject;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? "";
  const [slug, eventId] = id.split(":");

  if (!slug || !eventId) {
    return NextResponse.json({ error: "Missing live match id." }, { status: 400 });
  }

  const summary = await fetchSummary(slug, eventId);
  if (!summary) {
    const unavailable: LiveMatchDetails = {
      id,
      generatedAt: new Date().toISOString(),
      source: "ESPN live summary",
      available: false,
      message: "Live match stats are not available for this fixture yet.",
      headlineStats: [],
      teamStats: [],
      goals: [],
      cards: [],
      substitutions: [],
      lineups: []
    };
    return NextResponse.json(unavailable);
  }

  const teamStats = normalizeTeamStats(summary);
  const goals = normalizeScoringPlays(summary);
  const cards = normalizePlays(summary, "card", "card");
  const substitutions = normalizePlays(summary, "substitution", "substitution");
  const headlineLabels = ["Possession", "Shots on Goal", "Total Shots", "Corner Kicks", "Corners", "Yellow Cards"];
  const headlineStats = teamStats.filter((stat) => headlineLabels.some((label) => label.toLowerCase() === stat.label.toLowerCase())).slice(0, 6);
  const available = Boolean(teamStats.length || goals.length || cards.length || substitutions.length);

  const details: LiveMatchDetails = {
    id,
    generatedAt: new Date().toISOString(),
    source: "ESPN live summary",
    available,
    message: available ? undefined : "This match feed has opened, but detailed live stats are still pending.",
    headlineStats,
    teamStats,
    goals,
    cards,
    substitutions,
    lineups: normalizeLineups(summary)
  };

  return NextResponse.json(details);
}
