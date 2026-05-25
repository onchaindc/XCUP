import type { ArenaMatch } from "@/lib/arena/types";

const now = Date.now();
const hour = 60 * 60 * 1000;

export const mockArenaMatches: ArenaMatch[] = [
  {
    id: "football-intl-bra-fra",
    sport: "Football",
    league: "International Friendly",
    homeTeam: "Brazil",
    awayTeam: "France",
    startTime: new Date(now + 5 * hour).toISOString(),
    status: "upcoming"
  },
  {
    id: "football-club-mci-rma",
    sport: "Football",
    league: "Club Showcase",
    homeTeam: "Manchester City",
    awayTeam: "Real Madrid",
    startTime: new Date(now + 11 * hour).toISOString(),
    status: "upcoming"
  },
  {
    id: "basketball-ny-la",
    sport: "Basketball",
    league: "Pro Basketball",
    homeTeam: "New York",
    awayTeam: "Los Angeles",
    startTime: new Date(now + 18 * hour).toISOString(),
    status: "upcoming"
  },
  {
    id: "baseball-tor-bos",
    sport: "Baseball",
    league: "Major Baseball",
    homeTeam: "Toronto",
    awayTeam: "Boston",
    startTime: new Date(now + 29 * hour).toISOString(),
    status: "upcoming"
  },
  {
    id: "esports-falcons-liquid",
    sport: "Esports",
    league: "Counter-Strike Arena",
    homeTeam: "Falcons",
    awayTeam: "Liquid",
    startTime: new Date(now + 36 * hour).toISOString(),
    status: "upcoming"
  },
  {
    id: "esports-geng-t1",
    sport: "Esports",
    league: "League Championship",
    homeTeam: "Gen.G",
    awayTeam: "T1",
    startTime: new Date(now + 43 * hour).toISOString(),
    status: "upcoming"
  }
];
