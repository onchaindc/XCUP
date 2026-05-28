import { NextRequest, NextResponse } from "next/server";
import {
  buildSquadRanking,
  getFallbackCaptainApplicants,
  getFallbackMembers,
  getFallbackMessages,
  getFallbackSquads,
  getFallbackVotes,
  normalizeAddress,
  toMemberLabel,
  type CaptainVote,
  type SquadMember,
  type SquadRecord,
  type SquadCompetition,
  type SquadMessage,
  type SquadRole,
  type SquadRoomResponse
} from "@/lib/squads";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function competitions(squadName: string): SquadCompetition[] {
  return [
    { id: "stock", title: "Player Stock Market", status: "Live window", summary: `${squadName} portfolio opens before kickoff.` },
    { id: "shootout", title: "Penalty Shootout", status: "Ranked", summary: "1v1 streaks and squad-vs-squad records." },
    { id: "xi", title: "Starting XI Battles", status: "Voting", summary: "Build, compare, and vote on tactical boards." }
  ];
}

async function supabaseRequest(path: string, init?: RequestInit) {
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: supabaseKey,
      authorization: `Bearer ${supabaseKey}`,
      "content-type": "application/json",
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });
}

function toRecord(row: {
  id: string;
  name: string;
  motto: string;
  role: SquadRole;
  territory: string;
  accent: string;
  members: number;
  creator?: string;
  created_at?: string;
}): SquadRecord {
  return {
    id: row.id,
    name: row.name,
    motto: row.motto,
    role: row.role,
    territory: row.territory,
    accent: row.accent,
    members: row.members,
    creator: row.creator,
    createdAt: row.created_at ?? new Date().toISOString()
  };
}

function remoteRoomFor(squad: SquadRecord, members: SquadMember[], messages: SquadMessage[] = []) {
  return {
    squad,
    members,
    messages,
    captainApplicants: [],
    captainVotes: [],
    competitions: competitions(squad.name),
    liveActivity: [
      messages[0]?.body ? `Latest chat: ${messages[0].body}` : "Shared squad room opened.",
      "Captain vote is open.",
      `${members.filter((member) => member.online).length} members online.`
    ],
    ranking: buildSquadRanking(members.length, 0, 0)
  };
}

async function getRemoteRoom(id: string) {
  const squadResponse = await supabaseRequest(`squads?id=eq.${encodeURIComponent(id)}&select=id,name,motto,role,territory,accent,members,creator,created_at&limit=1`);
  if (!squadResponse) return null;
  if (!squadResponse.ok) return { error: "Unable to read squad from the configured database.", status: squadResponse.status || 500 };

  const [row] = (await squadResponse.json()) as Array<Parameters<typeof toRecord>[0]>;
  if (!row) return { error: "Squad not found.", status: 404 };

  const squad = toRecord(row);
  const membersResponse = await supabaseRequest(`squad_members?squad_id=eq.${encodeURIComponent(id)}&select=address,label,joined_at,online&order=joined_at.asc`);
  const members = membersResponse?.ok
    ? ((await membersResponse.json()) as Array<{ address: string; label?: string; joined_at?: string; online?: boolean }>).map((member) => ({
        address: member.address,
        label: member.label,
        joinedAt: member.joined_at ?? new Date().toISOString(),
        online: member.online ?? true
      }))
    : [];
  const messagesResponse = await supabaseRequest(`squad_messages?squad_id=eq.${encodeURIComponent(id)}&select=id,squad_id,author,body,kind,reply_to,pinned,reactions,attachment,tip_amount,created_at&order=created_at.desc&limit=100`);
  const messages = messagesResponse?.ok
    ? ((await messagesResponse.json()) as Array<{
        id: string;
        squad_id: string;
        author: string;
        body: string;
        kind: SquadMessage["kind"];
        reply_to?: string | null;
        pinned?: boolean;
        reactions?: Record<string, number>;
        attachment?: SquadMessage["attachment"];
        tip_amount?: string;
        created_at?: string;
      }>).map((message) => ({
        id: message.id,
        squadId: message.squad_id,
        author: message.author,
        body: message.body,
        kind: message.kind,
        createdAt: message.created_at ?? new Date().toISOString(),
        replyTo: message.reply_to ?? null,
        pinned: message.pinned ?? false,
        reactions: message.reactions ?? {},
        attachment: message.attachment ?? null,
        tipAmount: message.tip_amount
      }))
    : [];

  return { room: remoteRoomFor(squad, members, messages), status: 200 };
}

function roomFor(id: string) {
  const squad = getFallbackSquads().find((item) => item.id === id);
  if (!squad) {
    return null;
  }

  const members = Array.from((getFallbackMembers().get(id) ?? new Map()).values());
  const messages = getFallbackMessages().filter((message) => message.squadId === id);
  const captainApplicants = getFallbackCaptainApplicants().get(id) ?? [];
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
    captainApplicants,
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
  const remote = await getRemoteRoom(id);
  if (remote?.room) {
    return NextResponse.json({ room: remote.room } satisfies SquadRoomResponse);
  }
  if (remote?.error) {
    return NextResponse.json({ error: remote.error }, { status: remote.status });
  }

  const room = roomFor(id);
  if (!room) {
    return NextResponse.json({ error: "Squad not found." }, { status: 404 });
  }

  return NextResponse.json({ room } satisfies SquadRoomResponse);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = (await request.json().catch(() => null)) as {
    action?: "message" | "reaction" | "tip" | "vote" | "applyCaptain";
    address?: string;
    body?: string;
    messageId?: string;
    emoji?: string;
    amount?: string;
    to?: string;
    candidate?: string;
    candidateName?: string;
    statement?: string;
    attachment?: SquadMessage["attachment"];
    replyTo?: string | null;
  } | null;

  const address = normalizeAddress(payload?.address);
  if (!payload?.action || !address) {
    return NextResponse.json({ error: "Action and wallet address are required." }, { status: 400 });
  }

  const remote = await getRemoteRoom(id);
  if (remote?.room) {
    await supabaseRequest("squad_members", {
      method: "POST",
      headers: { prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({
        squad_id: id,
        address,
        label: toMemberLabel(address),
        online: true
      })
    });
    if (payload.action === "message" || payload.action === "tip") {
      await supabaseRequest("squad_messages", {
        method: "POST",
        body: JSON.stringify({
          id: crypto.randomUUID(),
          squad_id: id,
          author: address,
          body: payload.action === "tip" ? `Tipped ${payload.to ?? "the squad"} ${payload.amount ?? "1"} pts` : payload.body?.trim() || "Matchday signal",
          kind: payload.action,
          reply_to: payload.replyTo ?? null,
          reactions: {},
          attachment: payload.attachment ?? null,
          tip_amount: payload.action === "tip" ? payload.amount ?? "1" : null
        })
      });
    }
    if (payload.action === "reaction" && payload.messageId) {
      const current = remote.room.messages.find((message) => message.id === payload.messageId);
      if (current) {
        const emoji = payload.emoji || "fire";
        await supabaseRequest(`squad_messages?id=eq.${encodeURIComponent(payload.messageId)}&squad_id=eq.${encodeURIComponent(id)}`, {
          method: "PATCH",
          body: JSON.stringify({
            reactions: {
              ...current.reactions,
              [emoji]: (current.reactions[emoji] ?? 0) + 1
            }
          })
        });
      }
    }
    const updated = await getRemoteRoom(id);
    return NextResponse.json({ room: updated?.room ?? remote.room });
  }
  if (remote?.error && remote.status !== 404) {
    return NextResponse.json({ error: remote.error }, { status: remote.status });
  }

  const squad = getFallbackSquads().find((item) => item.id === id);
  if (!squad) {
    return NextResponse.json({ error: "Squad not found." }, { status: 404 });
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

  if (payload.action === "applyCaptain") {
    const applicants = getFallbackCaptainApplicants();
    const squadApplicants = applicants.get(id) ?? [];
    const name = payload.candidateName?.trim() || toMemberLabel(address);
    const nextApplicant = {
      address,
      name,
      statement: payload.statement?.trim() || undefined,
      appliedAt: new Date().toISOString(),
      elo: null,
      record: null,
      achievements: 0
    };
    applicants.set(id, [nextApplicant, ...squadApplicants.filter((item) => item.address !== address)]);
    return NextResponse.json({ room: roomFor(id) });
  }

  const voteMap = getFallbackVotes().get(id) ?? new Map<string, string>();
  voteMap.set(address, payload.candidate?.trim() || address);
  getFallbackVotes().set(id, voteMap);
  return NextResponse.json({ room: roomFor(id) });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = (await request.json().catch(() => null)) as { address?: string } | null;
  const address = normalizeAddress(payload?.address);
  const squads = getFallbackSquads();
  const index = squads.findIndex((item) => item.id === id);
  const squad = index >= 0 ? squads[index] : null;

  if (!squad) {
    return NextResponse.json({ error: "Squad not found." }, { status: 404 });
  }

  if (squad.creator && squad.creator !== address) {
    return NextResponse.json({ error: "Only the squad creator can delete this squad." }, { status: 403 });
  }

  squads.splice(index, 1);
  getFallbackMembers().delete(id);
  getFallbackVotes().delete(id);
  getFallbackCaptainApplicants().delete(id);

  const remainingMessages = getFallbackMessages().filter((message) => message.squadId !== id);
  getFallbackMessages().splice(0, getFallbackMessages().length, ...remainingMessages);

  return NextResponse.json({ ok: true });
}
