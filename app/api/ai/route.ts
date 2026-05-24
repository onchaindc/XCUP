import { NextRequest, NextResponse } from "next/server";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

type AiMessage = { role: "system" | "user" | "assistant"; content: string };
type WalletContext = {
  address: string | null;
  balance: string;
  username: string;
  activityCount: number;
  invoiceCount: number;
};

type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

function safeParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

async function parseProviderError(response: Response) {
  const fallback = { message: "AI provider request failed.", code: "provider_error" };
  try {
    const payload = (await response.json()) as {
      error?: { message?: string; code?: string };
    };
    const code = payload?.error?.code ?? fallback.code;
    if (code === "invalid_api_key") {
      return {
        message: "Invalid OPENAI_API_KEY configured on server. Update your Vercel environment variable and redeploy.",
        code
      };
    }
    return {
      message: payload?.error?.message ?? fallback.message,
      code
    };
  } catch {
    return fallback;
  }
}

async function resolveUsername(origin: string, username: string) {
  const response = await fetch(`${origin}/api/usernames?username=${encodeURIComponent(username)}`);
  if (!response.ok) {
    return { username, found: false, address: null, error: "lookup_failed" };
  }
  const data = (await response.json()) as { address: string | null };
  return { username, found: Boolean(data.address), address: data.address };
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 500 });
  }

  const body = (await request.json()) as {
    messages: AiMessage[];
    context: WalletContext;
  };
  const messages = body.messages ?? [];
  const context = body.context;
  const origin = request.nextUrl.origin;

  const systemPrompt = [
    "You are X Cup Oracle, a wallet-aware World Cup agent inside X Cup Arena.",
    "You must never claim that a transaction executed without a signed transaction hash.",
    "When the user asks to pay, swap, or invoice, prepare an action and ask for confirmation.",
    `Wallet context: ${JSON.stringify(context)}.`
  ].join(" ");

  const tools = [
    {
      type: "function",
      function: {
        name: "resolve_username",
        description: "Resolve a username to wallet address through the X Cup registry.",
        parameters: {
          type: "object",
          properties: {
            username: { type: "string" }
          },
          required: ["username"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "check_balance",
        description: "Check whether wallet balance can cover the requested amount.",
        parameters: {
          type: "object",
          properties: {
            amount: { type: "number" }
          },
          required: ["amount"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "prepare_payment",
        description: "Prepare a payment confirmation action in UI.",
        parameters: {
          type: "object",
          properties: {
            recipient: { type: "string" },
            amount: { type: "number" }
          }
        }
      }
    },
    {
      type: "function",
      function: {
        name: "prepare_invoice",
        description: "Prepare an invoice drafting action in UI.",
        parameters: {
          type: "object",
          properties: {
            amount: { type: "number" },
            token: { type: "string" }
          }
        }
      }
    }
  ];

  const firstPassResponse = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [{ role: "system", content: systemPrompt }, ...messages.filter((message) => message.role !== "system")],
      tools,
      tool_choice: "auto"
    })
  });

  if (!firstPassResponse.ok) {
    const providerError = await parseProviderError(firstPassResponse);
    return NextResponse.json({ error: providerError.message, code: providerError.code }, { status: 502 });
  }

  const firstPass = (await firstPassResponse.json()) as {
    choices?: Array<{
      message?: {
        role?: "assistant";
        content?: string | null;
        tool_calls?: ToolCall[];
      };
    }>;
  };
  const assistantMessage = firstPass.choices?.[0]?.message;
  const toolCalls = assistantMessage?.tool_calls ?? [];
  const toolMessages: Array<{ role: "tool"; tool_call_id: string; content: string }> = [];
  const actions: string[] = [];

  for (const call of toolCalls) {
    if (call.function.name === "resolve_username") {
      const args = safeParse<{ username?: string }>(call.function.arguments, {});
      const username = (args.username ?? "").replace(/^@/, "");
      const result = username ? await resolveUsername(origin, username) : { username: "", found: false, address: null };
      toolMessages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
    }
    if (call.function.name === "check_balance") {
      const args = safeParse<{ amount?: number }>(call.function.arguments, {});
      const requested = Number(args.amount ?? 0);
      const available = Number(context.balance || 0);
      toolMessages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify({ requested, available, sufficient: requested <= available })
      });
    }
    if (call.function.name === "prepare_payment") {
      actions.push("prepare_payment");
      toolMessages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify({ ok: true }) });
    }
    if (call.function.name === "prepare_invoice") {
      actions.push("prepare_invoice");
      toolMessages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify({ ok: true }) });
    }
  }

  const finalMessages: Array<Record<string, unknown>> = [
    { role: "system", content: systemPrompt },
    ...messages.filter((message) => message.role !== "system")
  ];

  if (assistantMessage?.tool_calls?.length) {
    finalMessages.push({
      role: "assistant",
      content: assistantMessage.content ?? "",
      tool_calls: assistantMessage.tool_calls
    });
    finalMessages.push(...toolMessages);
  }

  const finalResponse = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.7,
      stream: true,
      messages: finalMessages
    })
  });

  if (!finalResponse.ok || !finalResponse.body) {
    const providerError = await parseProviderError(finalResponse);
    return NextResponse.json({ error: providerError.message, code: providerError.code }, { status: 502 });
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = finalResponse.body.getReader();

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(`event:actions\ndata:${JSON.stringify(actions)}\n\n`));
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        controller.enqueue(encoder.encode(decoder.decode(value, { stream: true })));
      }
      controller.close();
      reader.releaseLock();
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
