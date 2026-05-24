export type SquadRole = "Captain" | "Strategist" | "Analyst" | "Treasurer" | "Scout";

export type SquadRecord = {
  id: string;
  name: string;
  motto: string;
  role: SquadRole;
  territory: string;
  accent: string;
  members: number;
  createdAt: string;
  creator?: string;
};

export type SquadsResponse = {
  squads: SquadRecord[];
};
