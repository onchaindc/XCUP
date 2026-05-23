import { NextRequest, NextResponse } from "next/server";

const registry = new Map<string, string>();

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username")?.replace(/^@/, "").toLowerCase();

  if (!username) {
    return NextResponse.json({ error: "username is required" }, { status: 400 });
  }

  const address = registry.get(username);

  return NextResponse.json({
    username: `@${username}`,
    available: !address,
    address: address ?? null,
    network: "X Layer testnet"
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { username?: string; address?: string };
  const username = body.username?.replace(/^@/, "").toLowerCase();

  if (!username || !body.address) {
    return NextResponse.json({ error: "username and address are required" }, { status: 400 });
  }

  if (registry.has(username)) {
    return NextResponse.json({ error: "username already claimed" }, { status: 409 });
  }

  registry.set(username, body.address);

  return NextResponse.json({
    username: `@${username}`,
    address: body.address,
    status: "claimed"
  });
}
