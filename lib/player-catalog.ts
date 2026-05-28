export type PlayerSport = "football" | "basketball";

export type PlayerClub = {
  id: string;
  name: string;
  sport: PlayerSport;
  league: string;
  searchName?: string;
  kind?: "club" | "country";
  logo?: string;
  flagCode?: string;
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
  { id: "arsenal", name: "Arsenal", sport: "football", league: "Premier League", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/359.png" },
  { id: "aston-villa", name: "Aston Villa", sport: "football", league: "Premier League" },
  { id: "bournemouth", name: "Bournemouth", sport: "football", league: "Premier League" },
  { id: "brentford", name: "Brentford", sport: "football", league: "Premier League" },
  { id: "brighton", name: "Brighton & Hove Albion", sport: "football", league: "Premier League", searchName: "Brighton" },
  { id: "burnley", name: "Burnley", sport: "football", league: "Premier League" },
  { id: "chelsea", name: "Chelsea", sport: "football", league: "Premier League", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/363.png" },
  { id: "crystal-palace", name: "Crystal Palace", sport: "football", league: "Premier League" },
  { id: "everton", name: "Everton", sport: "football", league: "Premier League" },
  { id: "fulham", name: "Fulham", sport: "football", league: "Premier League" },
  { id: "leeds", name: "Leeds United", sport: "football", league: "Premier League" },
  { id: "liverpool", name: "Liverpool", sport: "football", league: "Premier League", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/364.png" },
  { id: "man-city", name: "Manchester City", sport: "football", league: "Premier League", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/382.png" },
  { id: "man-united", name: "Manchester United", sport: "football", league: "Premier League", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/360.png" },
  { id: "newcastle", name: "Newcastle United", sport: "football", league: "Premier League" },
  { id: "nottingham-forest", name: "Nottingham Forest", sport: "football", league: "Premier League" },
  { id: "sunderland", name: "Sunderland", sport: "football", league: "Premier League" },
  { id: "tottenham", name: "Tottenham Hotspur", sport: "football", league: "Premier League", searchName: "Tottenham", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/367.png" },
  { id: "west-ham", name: "West Ham United", sport: "football", league: "Premier League" },
  { id: "wolves", name: "Wolverhampton Wanderers", sport: "football", league: "Premier League", searchName: "Wolves" },
  { id: "alaves", name: "Alaves", sport: "football", league: "LaLiga" },
  { id: "athletic-club", name: "Athletic Club", sport: "football", league: "LaLiga" },
  { id: "atletico", name: "Atletico Madrid", sport: "football", league: "LaLiga", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/1068.png" },
  { id: "barcelona", name: "Barcelona", sport: "football", league: "LaLiga", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/83.png" },
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
  { id: "real-madrid", name: "Real Madrid", sport: "football", league: "LaLiga", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/86.png" },
  { id: "real-oviedo", name: "Real Oviedo", sport: "football", league: "LaLiga" },
  { id: "real-sociedad", name: "Real Sociedad", sport: "football", league: "LaLiga" },
  { id: "sevilla", name: "Sevilla", sport: "football", league: "LaLiga" },
  { id: "valencia", name: "Valencia", sport: "football", league: "LaLiga" },
  { id: "villarreal", name: "Villarreal", sport: "football", league: "LaLiga" },
  { id: "psg", name: "Paris Saint-Germain", sport: "football", league: "Ligue 1", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/160.png" },
  { id: "bayern", name: "Bayern Munich", sport: "football", league: "Bundesliga", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/132.png" },
  { id: "dortmund", name: "Borussia Dortmund", sport: "football", league: "Bundesliga", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/124.png" },
  { id: "inter", name: "Internazionale", sport: "football", league: "Serie A", searchName: "Inter Milan", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/110.png" },
  { id: "milan", name: "AC Milan", sport: "football", league: "Serie A", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/103.png" },
  { id: "juventus", name: "Juventus", sport: "football", league: "Serie A", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/111.png" },
  { id: "france", name: "France", sport: "football", league: "World Cup", kind: "country", flagCode: "fr" },
  { id: "brazil", name: "Brazil", sport: "football", league: "World Cup", kind: "country", flagCode: "br" },
  { id: "argentina", name: "Argentina", sport: "football", league: "World Cup", kind: "country", flagCode: "ar" },
  { id: "england", name: "England", sport: "football", league: "World Cup", kind: "country", flagCode: "gb-eng" },
  { id: "spain", name: "Spain", sport: "football", league: "World Cup", kind: "country", flagCode: "es" },
  { id: "germany", name: "Germany", sport: "football", league: "World Cup", kind: "country", flagCode: "de" },
  { id: "portugal", name: "Portugal", sport: "football", league: "World Cup", kind: "country", flagCode: "pt" },
  { id: "netherlands", name: "Netherlands", sport: "football", league: "World Cup", kind: "country", flagCode: "nl" },
  { id: "italy", name: "Italy", sport: "football", league: "World Cup", kind: "country", flagCode: "it" },
  { id: "belgium", name: "Belgium", sport: "football", league: "World Cup", kind: "country", flagCode: "be" },
  { id: "croatia", name: "Croatia", sport: "football", league: "World Cup", kind: "country", flagCode: "hr" },
  { id: "morocco", name: "Morocco", sport: "football", league: "World Cup", kind: "country", flagCode: "ma" },
  { id: "usa", name: "United States", sport: "football", league: "World Cup", kind: "country", flagCode: "us" },
  { id: "mexico", name: "Mexico", sport: "football", league: "World Cup", kind: "country", flagCode: "mx" },
  { id: "nigeria", name: "Nigeria", sport: "football", league: "World Cup", kind: "country", flagCode: "ng" },
  { id: "senegal", name: "Senegal", sport: "football", league: "World Cup", kind: "country", flagCode: "sn" },
  { id: "ghana", name: "Ghana", sport: "football", league: "World Cup", kind: "country", flagCode: "gh" },
  { id: "celtics", name: "Boston Celtics", sport: "basketball", league: "NBA" },
  { id: "lakers", name: "Los Angeles Lakers", sport: "basketball", league: "NBA" },
  { id: "warriors", name: "Golden State Warriors", sport: "basketball", league: "NBA" },
  { id: "nuggets", name: "Denver Nuggets", sport: "basketball", league: "NBA" },
  { id: "bucks", name: "Milwaukee Bucks", sport: "basketball", league: "NBA" },
  { id: "mavericks", name: "Dallas Mavericks", sport: "basketball", league: "NBA" }
];

export function slotsForSport(sport: PlayerSport) {
  return sport === "football" ? footballSlots : basketballSlots;
}

export function clubsForSport(sport: PlayerSport) {
  return playerClubs.filter((club) => club.sport === sport);
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
