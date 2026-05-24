export type PlayerSport = "football" | "basketball";

export type PlayerClub = {
  id: string;
  name: string;
  sport: PlayerSport;
  league: string;
  searchName?: string;
};

export type PlayerOption = {
  id: string;
  name: string;
  sport: PlayerSport;
  club: string;
  league: string;
  position: string;
  positions: string[];
  image?: string;
  country?: string;
};

export type LineupSlot = {
  id: string;
  label: string;
  position: string;
  x: number;
  y: number;
};

export const footballSlots: LineupSlot[] = [
  { id: "gk", label: "GK", position: "GK", x: 50, y: 90 },
  { id: "lb", label: "LB", position: "LB", x: 18, y: 70 },
  { id: "cb-1", label: "CB", position: "CB", x: 39, y: 74 },
  { id: "cb-2", label: "CB", position: "CB", x: 61, y: 74 },
  { id: "rb", label: "RB", position: "RB", x: 82, y: 70 },
  { id: "cm-1", label: "CM", position: "CM", x: 34, y: 50 },
  { id: "cm-2", label: "CM", position: "CM", x: 66, y: 50 },
  { id: "am", label: "AM", position: "AM", x: 50, y: 35 },
  { id: "lw", label: "LW", position: "LW", x: 22, y: 18 },
  { id: "st", label: "ST", position: "ST", x: 50, y: 12 },
  { id: "rw", label: "RW", position: "RW", x: 78, y: 18 }
];

export const basketballSlots: LineupSlot[] = [
  { id: "pg", label: "PG", position: "PG", x: 50, y: 80 },
  { id: "sg", label: "SG", position: "SG", x: 25, y: 58 },
  { id: "sf", label: "SF", position: "SF", x: 75, y: 58 },
  { id: "pf", label: "PF", position: "PF", x: 34, y: 28 },
  { id: "c", label: "C", position: "C", x: 66, y: 22 }
];

export const playerClubs: PlayerClub[] = [
  { id: "arsenal", name: "Arsenal", sport: "football", league: "Premier League" },
  { id: "aston-villa", name: "Aston Villa", sport: "football", league: "Premier League" },
  { id: "bournemouth", name: "Bournemouth", sport: "football", league: "Premier League" },
  { id: "brentford", name: "Brentford", sport: "football", league: "Premier League" },
  { id: "brighton", name: "Brighton & Hove Albion", sport: "football", league: "Premier League", searchName: "Brighton" },
  { id: "burnley", name: "Burnley", sport: "football", league: "Premier League" },
  { id: "chelsea", name: "Chelsea", sport: "football", league: "Premier League" },
  { id: "crystal-palace", name: "Crystal Palace", sport: "football", league: "Premier League" },
  { id: "everton", name: "Everton", sport: "football", league: "Premier League" },
  { id: "fulham", name: "Fulham", sport: "football", league: "Premier League" },
  { id: "leeds", name: "Leeds United", sport: "football", league: "Premier League" },
  { id: "liverpool", name: "Liverpool", sport: "football", league: "Premier League" },
  { id: "man-city", name: "Manchester City", sport: "football", league: "Premier League" },
  { id: "man-united", name: "Manchester United", sport: "football", league: "Premier League" },
  { id: "newcastle", name: "Newcastle United", sport: "football", league: "Premier League" },
  { id: "nottingham-forest", name: "Nottingham Forest", sport: "football", league: "Premier League" },
  { id: "sunderland", name: "Sunderland", sport: "football", league: "Premier League" },
  { id: "tottenham", name: "Tottenham Hotspur", sport: "football", league: "Premier League", searchName: "Tottenham" },
  { id: "west-ham", name: "West Ham United", sport: "football", league: "Premier League" },
  { id: "wolves", name: "Wolverhampton Wanderers", sport: "football", league: "Premier League", searchName: "Wolves" },
  { id: "alaves", name: "Alaves", sport: "football", league: "LaLiga" },
  { id: "athletic-club", name: "Athletic Club", sport: "football", league: "LaLiga" },
  { id: "atletico", name: "Atletico Madrid", sport: "football", league: "LaLiga" },
  { id: "barcelona", name: "Barcelona", sport: "football", league: "LaLiga" },
  { id: "celta", name: "Celta Vigo", sport: "football", league: "LaLiga" },
  { id: "elche", name: "Elche", sport: "football", league: "LaLiga" },
  { id: "espanyol", name: "Espanyol", sport: "football", league: "LaLiga" },
  { id: "getafe", name: "Getafe", sport: "football", league: "LaLiga" },
  { id: "girona", name: "Girona", sport: "football", league: "LaLiga" },
  { id: "levante", name: "Levante", sport: "football", league: "LaLiga" },
  { id: "mallorca", name: "Mallorca", sport: "football", league: "LaLiga" },
  { id: "osasuna", name: "Osasuna", sport: "football", league: "LaLiga" },
  { id: "rayo", name: "Rayo Vallecano", sport: "football", league: "LaLiga" },
  { id: "real-betis", name: "Real Betis", sport: "football", league: "LaLiga" },
  { id: "real-madrid", name: "Real Madrid", sport: "football", league: "LaLiga" },
  { id: "real-oviedo", name: "Real Oviedo", sport: "football", league: "LaLiga" },
  { id: "real-sociedad", name: "Real Sociedad", sport: "football", league: "LaLiga" },
  { id: "sevilla", name: "Sevilla", sport: "football", league: "LaLiga" },
  { id: "valencia", name: "Valencia", sport: "football", league: "LaLiga" },
  { id: "villarreal", name: "Villarreal", sport: "football", league: "LaLiga" },
  { id: "celtics", name: "Boston Celtics", sport: "basketball", league: "NBA" },
  { id: "lakers", name: "Los Angeles Lakers", sport: "basketball", league: "NBA" },
  { id: "warriors", name: "Golden State Warriors", sport: "basketball", league: "NBA" },
  { id: "nuggets", name: "Denver Nuggets", sport: "basketball", league: "NBA" },
  { id: "bucks", name: "Milwaukee Bucks", sport: "basketball", league: "NBA" },
  { id: "mavericks", name: "Dallas Mavericks", sport: "basketball", league: "NBA" }
];

const fallbackPlayers: PlayerOption[] = [
  football("david-raya", "David Raya", "Arsenal", "Premier League", "GK"),
  football("william-saliba", "William Saliba", "Arsenal", "Premier League", "CB"),
  football("gabriel-magalhaes", "Gabriel Magalhaes", "Arsenal", "Premier League", "CB"),
  football("declan-rice", "Declan Rice", "Arsenal", "Premier League", "CM"),
  football("martin-odegaard", "Martin Odegaard", "Arsenal", "Premier League", "AM"),
  football("bukayo-saka", "Bukayo Saka", "Arsenal", "Premier League", "RW"),
  football("gabriel-martinelli", "Gabriel Martinelli", "Arsenal", "Premier League", "LW"),
  football("alisson", "Alisson Becker", "Liverpool", "Premier League", "GK"),
  football("virgil-van-dijk", "Virgil van Dijk", "Liverpool", "Premier League", "CB"),
  football("mohamed-salah", "Mohamed Salah", "Liverpool", "Premier League", "RW"),
  football("erling-haaland", "Erling Haaland", "Manchester City", "Premier League", "ST"),
  football("phil-foden", "Phil Foden", "Manchester City", "Premier League", "AM"),
  football("cole-palmer", "Cole Palmer", "Chelsea", "Premier League", "AM"),
  football("reece-james", "Reece James", "Chelsea", "Premier League", "RB"),
  football("thibaut-courtois", "Thibaut Courtois", "Real Madrid", "LaLiga", "GK"),
  football("antonio-rudiger", "Antonio Rudiger", "Real Madrid", "LaLiga", "CB"),
  football("federico-valverde", "Federico Valverde", "Real Madrid", "LaLiga", "CM"),
  football("jude-bellingham", "Jude Bellingham", "Real Madrid", "LaLiga", "AM"),
  football("vinicius-junior", "Vinicius Junior", "Real Madrid", "LaLiga", "LW"),
  football("kylian-mbappe", "Kylian Mbappe", "Real Madrid", "LaLiga", "ST"),
  football("marc-andre-ter-stegen", "Marc-Andre ter Stegen", "Barcelona", "LaLiga", "GK"),
  football("ronald-araujo", "Ronald Araujo", "Barcelona", "LaLiga", "CB"),
  football("pedri", "Pedri", "Barcelona", "LaLiga", "CM"),
  football("lamine-yamal", "Lamine Yamal", "Barcelona", "LaLiga", "RW"),
  football("robert-lewandowski", "Robert Lewandowski", "Barcelona", "LaLiga", "ST"),
  football("jan-oblak", "Jan Oblak", "Atletico Madrid", "LaLiga", "GK"),
  football("antoine-griezmann", "Antoine Griezmann", "Atletico Madrid", "LaLiga", "AM"),
  basketball("jayson-tatum", "Jayson Tatum", "Boston Celtics", "NBA", "SF"),
  basketball("jaylen-brown", "Jaylen Brown", "Boston Celtics", "NBA", "SG"),
  basketball("lebron-james", "LeBron James", "Los Angeles Lakers", "NBA", "SF"),
  basketball("luka-doncic", "Luka Doncic", "Los Angeles Lakers", "NBA", "PG"),
  basketball("stephen-curry", "Stephen Curry", "Golden State Warriors", "NBA", "PG"),
  basketball("jimmy-butler", "Jimmy Butler", "Golden State Warriors", "NBA", "SF"),
  basketball("nikola-jokic", "Nikola Jokic", "Denver Nuggets", "NBA", "C"),
  basketball("giannis-antetokounmpo", "Giannis Antetokounmpo", "Milwaukee Bucks", "NBA", "PF")
];

function football(id: string, name: string, club: string, league: string, position: string): PlayerOption {
  return { id, name, sport: "football", club, league, position, positions: expandFootballPosition(position) };
}

function basketball(id: string, name: string, club: string, league: string, position: string): PlayerOption {
  return { id, name, sport: "basketball", club, league, position, positions: [position] };
}

export function slotsForSport(sport: PlayerSport) {
  return sport === "football" ? footballSlots : basketballSlots;
}

export function clubsForSport(sport: PlayerSport) {
  return playerClubs.filter((club) => club.sport === sport);
}

export function fallbackPlayersFor(clubName: string, sport: PlayerSport, position?: string) {
  return fallbackPlayers.filter((player) => {
    const clubMatches = player.club.toLowerCase() === clubName.toLowerCase();
    const sportMatches = player.sport === sport;
    const positionMatches = !position || player.positions.includes(position) || player.position === position;
    return clubMatches && sportMatches && positionMatches;
  });
}

export function expandFootballPosition(position: string) {
  const normalized = normalizeFootballPosition(position);
  if (normalized === "CB") {
    return ["CB", "LB", "RB"];
  }
  if (normalized === "CM") {
    return ["CM", "AM"];
  }
  if (normalized === "AM") {
    return ["AM", "CM", "LW", "RW"];
  }
  if (normalized === "ST") {
    return ["ST", "LW", "RW"];
  }
  return [normalized];
}

export function normalizeFootballPosition(position?: string) {
  const value = (position ?? "").toLowerCase();
  if (value.includes("goal")) return "GK";
  if (value.includes("left back")) return "LB";
  if (value.includes("right back")) return "RB";
  if (value.includes("defend") || value.includes("centre-back") || value.includes("center-back")) return "CB";
  if (value.includes("winger") && value.includes("left")) return "LW";
  if (value.includes("winger") && value.includes("right")) return "RW";
  if (value.includes("forward") || value.includes("striker")) return "ST";
  if (value.includes("attacking")) return "AM";
  if (value.includes("midfield")) return "CM";
  if (["GK", "LB", "CB", "RB", "CM", "AM", "LW", "ST", "RW"].includes(position ?? "")) return position ?? "CM";
  return "CM";
}

export function normalizeBasketballPosition(position?: string) {
  const value = (position ?? "").toLowerCase();
  if (value.includes("point")) return "PG";
  if (value.includes("shooting")) return "SG";
  if (value.includes("small")) return "SF";
  if (value.includes("power")) return "PF";
  if (value.includes("center") || value.includes("centre")) return "C";
  if (["PG", "SG", "SF", "PF", "C"].includes(position ?? "")) return position ?? "PG";
  return "PG";
}
