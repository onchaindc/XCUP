import { NextRequest, NextResponse } from "next/server";
import {
  getFallbackMembers,
  getFallbackSquads,
  normalizeAddress,
  toMemberLabel,
  type SquadRecord,
  type SquadRole,
  type SquadsResponse
} from "@/lib/squads";

export const dynamic = "force-dynamic";

const roles: SquadRole[] = ["Captain", "Strategist", "Analyst", "Treasurer", "Scout"];
const accents = new Set(["#18e3bd", "#42a5ff", "#f5a524", "#ff5c39"]);
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function store() {
  return getFallbackSquads();
}

function slug(value: string) {
  const base = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${base || "squad"}-${Date.now().toString(36)}`;
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

export async function GET() {
  const response = await supabaseRequest("squads?select=id,name,motto,role,territory,accent,members,creator,created_at&order=created_at.desc");
  if (response?.ok) {
    const rows = (await response.json()) as Array<Parameters<typeof toRecord>[0]>;
    return NextResponse.json({ squads: rows.map(toRecord) } satisfies SquadsResponse);
  }

  const body: SquadsResponse = {
    squads: store().slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  };

  return NextResponse.json(body);
}

export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => null)) as {
    action?: "create" | "join";
    id?: string;
    name?: string;
    motto?: string;
    role?: SquadRole;
    territory?: string;
    accent?: string;
    address?: string;
  } | null;

  if (!payload?.action) {
    return NextResponse.json({ error: "Missing squad action." }, { status: 400 });
  }

  const squads = store();

  if (payload.action === "create") {
    const name = payload.name?.trim();
    if (!name) {
      return NextResponse.json({ error: "Add a squad name first." }, { status: 400 });
    }

    const addressKey = normalizeAddress(payload.address);
    const existing = squads.find((squad) => squad.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      return NextResponse.json({ error: "A squad with this name already exists." }, { status: 409 });
    }

    const role = payload.role && roles.includes(payload.role) ? payload.role : "Captain";
    const squad: SquadRecord = {
      id: slug(name),
      name,
      motto: payload.motto?.trim() || "Fresh squad, fresh tactics.",
      role,
      territory: payload.territory?.trim() || "Global",
      accent: payload.accent && accents.has(payload.accent) ? payload.accent : "#18e3bd",
      members: addressKey ? 1 : 0,
      createdAt: new Date().toISOString(),
      creator: addressKey || undefined
    };

    const response = await supabaseRequest("squads", {
      method: "POST",
      headers: { prefer: "return=representation" },
      body: JSON.stringify({
        id: squad.id,
        name: squad.name,
        motto: squad.motto,
        role: squad.role,
        territory: squad.territory,
        accent: squad.accent,
        members: squad.members,
        creator: squad.creator
      })
    });
    if (response?.ok) {
      const [created] = (await response.json()) as Array<Parameters<typeof toRecord>[0]>;
      return NextResponse.json({ squad: toRecord(created) });
    }
    if (response) {
      return NextResponse.json({ error: "Unable to create squad in the configured database." }, { status: response.status || 500 });
    }

    squads.unshift(squad);
    if (addressKey) {
      const members = getFallbackMembers();
      const squadMembers = members.get(squad.id) ?? new Map();
      squadMembers.set(addressKey, {
        address: addressKey,
        label: toMemberLabel(addressKey),
        joinedAt: squad.createdAt,
        online: true
      });
      members.set(squad.id, squadMembers);
    }
    return NextResponse.json({ squad });
  }
  const addressKey = normalizeAddress(payload.address);
  if (!addressKey) {
    return NextResponse.json({ error: "Wallet address is required to join a squad." }, { status: 400 });
  }

  const remote = await supabaseRequest(`squads?id=eq.${encodeURIComponent(payload.id ?? "")}&select=id,name,motto,role,territory,accent,members,creator,created_at&limit=1`);
  if (remote?.ok) {
    const [current] = (await remote.json()) as Array<Parameters<typeof toRecord>[0]>;
    if (!current) {
      return NextResponse.json({ error: "Squad not found." }, { status: 404 });
    }
    const updatedMembers = current.creator?.toLowerCase() === addressKey ? current.members : current.members + 1;
    const update = await supabaseRequest(`squads?id=eq.${encodeURIComponent(current.id)}`, {
      method: "PATCH",
      headers: { prefer: "return=representation" },
      body: JSON.stringify({ members: updatedMembers })
    });
    if (update?.ok) {
      const [updated] = (await update.json()) as Array<Parameters<typeof toRecord>[0]>;
      return NextResponse.json({ squad: toRecord(updated) });
    }
    if (update) {
      return NextResponse.json({ error: "Unable to update squad in the configured database." }, { status: update.status || 500 });
    }
  }
  if (remote) {
    return NextResponse.json({ error: "Unable to read squad from the configured database." }, { status: remote.status || 500 });
  }

  const squad = squads.find((item) => item.id === payload.id);
  if (!squad) {
    return NextResponse.json({ error: "Squad not found." }, { status: 404 });
  }

  const members = getFallbackMembers();
  const squadMembers = members.get(squad.id) ?? new Map();
  if (squadMembers.has(addressKey)) {
    return NextResponse.json({ squad });
  }
  squadMembers.set(addressKey, {
    address: addressKey,
    label: toMemberLabel(addressKey),
    joinedAt: new Date().toISOString(),
    online: true
  });
  members.set(squad.id, squadMembers);
  squad.members = squadMembers.size;
  return NextResponse.json({ squad });
}
