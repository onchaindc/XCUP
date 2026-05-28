export type LiveSportEvent = {
  id: string;
  sport: string;
  league: string;
  priority: number;
  name: string;
  shortName: string;
  date: string;
  status: {
    state: string;
    detail: string;
    clock: string;
  };
  venue?: string;
  homeTeam: {
    id?: string;
    name: string;
    shortName: string;
    logo?: string;
    score?: string;
  };
  awayTeam: {
    id?: string;
    name: string;
    shortName: string;
    logo?: string;
    score?: string;
  };
  link?: string;
};

export type LiveMatchStat = {
  label: string;
  home: string;
  away: string;
};

export type LiveMatchPlayerEvent = {
  id: string;
  minute: string;
  team: string;
  player: string;
  assist?: string;
  type: "goal" | "card" | "substitution" | "event";
  detail?: string;
};

export type LiveMatchLineup = {
  team: string;
  starters: string[];
  substitutes: string[];
};

export type LiveMatchDetails = {
  id: string;
  generatedAt: string;
  source: string;
  available: boolean;
  message?: string;
  headlineStats: LiveMatchStat[];
  teamStats: LiveMatchStat[];
  goals: LiveMatchPlayerEvent[];
  cards: LiveMatchPlayerEvent[];
  substitutions: LiveMatchPlayerEvent[];
  lineups: LiveMatchLineup[];
};

export type SportsNewsItem = {
  id: string;
  title: string;
  description: string;
  summary?: string;
  link: string;
  image?: string;
  source: string;
  byline?: string;
  category?: string;
  published?: string;
};

export type LiveSportsResponse = {
  generatedAt: string;
  scanned: string[];
  events: LiveSportEvent[];
};

export type SportsNewsResponse = {
  generatedAt: string;
  items: SportsNewsItem[];
};

export function formatLiveEventMatchup(event: Pick<LiveSportEvent, "awayTeam" | "homeTeam" | "shortName">) {
  const away = event.awayTeam.shortName || event.awayTeam.name;
  const home = event.homeTeam.shortName || event.homeTeam.name;

  if (away && home && away !== "TBD" && home !== "TBD") {
    return `${away} VS ${home}`;
  }

  return event.shortName.replace(/\s+@\s+|\s+at\s+/gi, " VS ");
}

export function isLiveEvent(event: Pick<LiveSportEvent, "status">) {
  return event.status.state === "in";
}

export function eventStatusLabel(event: Pick<LiveSportEvent, "status">) {
  if (event.status.state === "in") {
    return "Live";
  }
  if (event.status.state === "pre") {
    return "Scheduled";
  }
  return event.status.state || "Scheduled";
}

export function formatEventTime(event: Pick<LiveSportEvent, "date">) {
  const scheduled = new Date(event.date);
  if (Number.isNaN(scheduled.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(scheduled);
}
