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

export type SquadMember = {
  address: string;
  label?: string;
  joinedAt: string;
  online: boolean;
};

export type SquadAttachment = {
  type: "image" | "gif";
  url: string;
  label?: string;
};

export type SquadMessage = {
  id: string;
  squadId: string;
  author: string;
  body: string;
  createdAt: string;
  kind: "message" | "tip" | "system";
  replyTo?: string | null;
  pinned?: boolean;
  reactions: Record<string, number>;
  attachment?: SquadAttachment | null;
  tipAmount?: string;
};

export type CaptainVote = {
  candidate: string;
  votes: number;
  voters: string[];
  updatedAt: string;
};

export type SquadCompetition = {
  id: string;
  title: string;
  status: string;
  summary: string;
};

export type SquadRoom = {
  squad: SquadRecord;
  members: SquadMember[];
  messages: SquadMessage[];
  captainVotes: CaptainVote[];
  liveActivity: string[];
  competitions: SquadCompetition[];
  ranking: number;
};

export type SquadsResponse = {
  squads: SquadRecord[];
};

export type SquadRoomResponse = {
  room: SquadRoom;
};

declare global {
  var xCupSquads: SquadRecord[] | undefined;
  var xCupSquadMembers: Map<string, Map<string, SquadMember>> | undefined;
  var xCupSquadMessages: SquadMessage[] | undefined;
  var xCupSquadVotes: Map<string, Map<string, string>> | undefined;
}

export function getFallbackSquads() {
  globalThis.xCupSquads ??= [];
  return globalThis.xCupSquads;
}

export function getFallbackMembers() {
  globalThis.xCupSquadMembers ??= new Map();
  return globalThis.xCupSquadMembers;
}

export function getFallbackMessages() {
  globalThis.xCupSquadMessages ??= [];
  return globalThis.xCupSquadMessages;
}

export function getFallbackVotes() {
  globalThis.xCupSquadVotes ??= new Map();
  return globalThis.xCupSquadVotes;
}

export function normalizeAddress(address?: string | null) {
  return address?.trim().toLowerCase() ?? "";
}

export function toMemberLabel(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function buildSquadRanking(memberCount: number, messageCount: number, voteCount: number) {
  return 1000 + memberCount * 20 + messageCount * 5 + voteCount * 8;
}
