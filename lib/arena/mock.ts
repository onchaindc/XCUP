import type { ArenaMatch } from "@/lib/arena/types";

const now = Date.now();
const hour = 60 * 60 * 1000;

export const mockArenaMatches: ArenaMatch[] = [
  {
    id: "mock-football-north-south",
    sport: "Football",
    league: "Demo Schedule",
    homeTeam: "North XI",
    awayTeam: "South XI",
    startTime: new Date(now + 5 * hour).toISOString(),
    status: "upcoming"
  },
  {
    id: "mock-football-east-west",
    sport: "Football",
    league: "Demo Schedule",
    homeTeam: "East XI",
    awayTeam: "West XI",
    startTime: new Date(now + 11 * hour).toISOString(),
    status: "upcoming"
  },
  {
    id: "mock-basketball-metro-harbor",
    sport: "Basketball",
    league: "Demo Schedule",
    homeTeam: "Metro Hoops",
    awayTeam: "Harbor Hoops",
    startTime: new Date(now + 18 * hour).toISOString(),
    status: "upcoming"
  },
  {
    id: "mock-baseball-summit-coastal",
    sport: "Baseball",
    league: "Demo Schedule",
    homeTeam: "Summit Nine",
    awayTeam: "Coastal Nine",
    startTime: new Date(now + 29 * hour).toISOString(),
    status: "upcoming"
  },
  {
    id: "mock-esports-alpha-vector",
    sport: "Esports",
    league: "Demo Schedule",
    homeTeam: "Alpha Stack",
    awayTeam: "Vector Stack",
    startTime: new Date(now + 36 * hour).toISOString(),
    status: "upcoming"
  },
  {
    id: "mock-esports-orbit-nexus",
    sport: "Esports",
    league: "Demo Schedule",
    homeTeam: "Orbit Core",
    awayTeam: "Nexus Core",
    startTime: new Date(now + 43 * hour).toISOString(),
    status: "upcoming"
  }
];
