export type ArenaSport = "Football" | "Basketball" | "Baseball" | "Esports";
export type ArenaOutcome = "HOME" | "DRAW" | "AWAY";
export type ArenaConfidence = "Low" | "Medium" | "High";
export type ArenaAsset = "OKB" | "USDC";
export type ArenaSlipStatus = "PENDING" | "LOCKED" | "WON" | "LOST" | "EXITED";

export type ArenaMatch = {
  id: string;
  sport: ArenaSport;
  league: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  status: "upcoming" | "live" | "final";
  homeScore?: number;
  awayScore?: number;
  result?: ArenaOutcome;
};

export type ArenaSlip = {
  id: string;
  chainSlipId?: string;
  matchId: string;
  matchName: string;
  sport: ArenaSport;
  league?: string;
  matchStartTime?: string;
  matchStatus?: ArenaMatch["status"];
  predictedOutcome: ArenaOutcome;
  confidence: ArenaConfidence;
  reasoning: string;
  asset: ArenaAsset;
  amount: string;
  amountUnits: string;
  status: ArenaSlipStatus;
  txHash?: `0x${string}`;
  actualResult?: ArenaOutcome;
  rewardClaimed?: boolean;
  createdAt: string;
};

export type ArenaStats = {
  xp: number;
  streak: number;
  totalChallenges: number;
};
