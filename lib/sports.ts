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

export type SportsNewsItem = {
  id: string;
  title: string;
  description: string;
  link: string;
  image?: string;
  source: string;
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
