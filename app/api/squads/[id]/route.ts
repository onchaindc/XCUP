import { NextRequest, NextResponse } from "next/server";
import {
  buildSquadRanking,
  getFallbackMembers,
  getFallbackMessages,
  getFallbackSquads,
  getFallbackVotes,
  normalizeAddress,
  toMemberLabel,
  type CaptainVote,
  type SquadCompetition,
  type SquadMessage,
  type SquadRoomResponse
} from "@/lib/squads";

export const dynamic = "force-dynamic";

function competitions(squadName: string): SquadCompetition[] {
  return [
    { id: "stock", title: "Player Stock Market", status: "Live window", summary: `${squadName} portfolio opens before kickoff.` },
    { id: "shootout", title: "Penalty Shootout", status: "Ranked", summary: "1v1 streaks and squad-vs-squad records." },
    { id: "xi", title: "Starting XI Battles", status: "Voting", summary: "Build, compare, and vote on tactical boards." }
  ];
}

function roomFor(id: string) {
  const squad = getFallbackSquads().find((item) => item.id === id);
  if (!squad) {
    return null;
  }

  const members = Array.from((getFallbackMembers().get(id) ?? new Map()).values());
  const messages = getFallbackMessages().filter((message) => message.squadId === id);
  const voteMap = getFallbackVotes().get(id) ?? new Map();
  const votes = new Map<string, string[]>();
  voteMap.forEach((candidate, voter) => {
    votes.set(candidate, [...(votes.get(candidate) ?? []), voter]);
  });
  const captainVotes: CaptainVote[] = Array.from(votes.entries()).map(([candidate, voters]) => ({
    candidate,
    votes: voters.length,
    voters,
    updatedAt: new Date().toISOString()
  }));

  return {
    squad,
    members,
    messages,
    captainVotes,
    competitions: competitions(squad.name),
    liveActivity: [
      messages[0]?.body ? `Latest chat: ${messages[0].body}` : "Squad room opened.",
      captainVotes[0] ? `${captainVotes[0].candidate} leads captain voting.` : "Captain vote is open.",
      `${members.filter((member) => member.online).length} members online.`
    ],
    ranking: buildSquadRanking(members.length, messages.length, captainVotes.reduce((total, vote) => total + vote.votes, 0))
  };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const room = roomFor(id);
  if (!room) {
    return NextResponse.json({ error: "Squad not found." }, { status: 404 });
  }

  return NextResponse.json({ room } satisfies SquadRoomResponse);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const squad = getFallbackSquads().find((item) => item.id === id);
  if (!squad) {
    return NextResponse.json({ error: "Squad not found." }, { status: 404 });
  }

  const payload = (await request.json().catch(() => null)) as {
    action?: "message" | "reaction" | "tip" | "vote";
    address?: string;
    body?: string;
    messageId?: string;
    emoji?: string;
    amount?: string;
    to?: string;
    candidate?: string;
    attachment?: SquadMessage["attachment"];
    replyTo?: string | null;
  } | null;

  const address = normalizeAddress(payload?.address);
  if (!payload?.action || !address) {
    return NextResponse.json({ error: "Action and wallet address are required." }, { status: 400 });
  }

  const members = getFallbackMembers();
  const squadMembers = members.get(id) ?? new Map();
  if (!squadMembers.has(address)) {
    squadMembers.set(address, { address, label: toMemberLabel(address), joinedAt: new Date().toISOString(), online: true });
    members.set(id, squadMembers);
    squad.members = squadMembers.size;
  }

  if (payload.action === "message" || payload.action === "tip") {
    const message: SquadMessage = {
      id: crypto.randomUUID(),
      squadId: id,
      author: address,
      body: payload.action === "tip" ? `Tipped ${payload.to ?? "the squad"} ${payload.amount ?? "1"} pts` : payload.body?.trim() || "Matchday signal",
      kind: payload.action,
      createdAt: new Date().toISOString(),
      replyTo: payload.replyTo ?? null,
      pinned: false,
      reactions: {},
      attachment: payload.attachment ?? null,
      tipAmount: payload.action === "tip" ? payload.amount ?? "1" : undefined
    };
    getFallbackMessages().unshift(message);
    return NextResponse.json({ room: roomFor(id) });
  }

  if (payload.action === "reaction") {
    const message = getFallbackMessages().find((item) => item.id === payload.messageId && item.squadId === id);
    if (!message) {
      return NextResponse.json({ error: "Message not found." }, { status: 404 });
    }
    const emoji = payload.emoji || "fire";
    message.reactions[emoji] = (message.reactions[emoji] ?? 0) + 1;
    return NextResponse.json({ room: roomFor(id) });
  }

  const voteMap = getFallbackVotes().get(id) ?? new Map<string, string>();
  voteMap.set(address, payload.candidate || address);
  getFallbackVotes().set(id, voteMap);
  return NextResponse.json({ room: roomFor(id) });
}
