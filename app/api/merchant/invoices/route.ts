import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    amount?: string;
    settlementToken?: string;
    merchant?: string;
  };

  if (!body.amount) {
    return NextResponse.json({ error: "amount is required" }, { status: 400 });
  }

  const invoiceId = `xcup_${crypto.randomUUID().slice(0, 8)}`;

  return NextResponse.json({
    invoiceId,
    merchant: body.merchant ?? "@merchant",
    amount: body.amount,
    payToken: "ETH",
    settlementToken: body.settlementToken ?? "USDC",
    checkoutUrl: `https://xcup.example/pay/${invoiceId}`,
    qrPayload: `xcup://pay/${invoiceId}`,
    status: "created",
    network: "X Layer"
  });
}

export async function GET() {
  return NextResponse.json({
    invoices: [],
    storage: "Configure Supabase or PostgreSQL to persist merchant invoice history."
  });
}
