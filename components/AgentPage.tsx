"use client";

import { motion } from "framer-motion";
import { Activity, ArrowRight, Bot, Brain, CheckCircle2, Gauge, Radio, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatUnits, isAddress, keccak256, toBytes } from "viem";
import { useAccount, useBalance, useConnect, useDisconnect, useWriteContract } from "wagmi";
import { formatLiveEventMatchup, type LiveSportEvent } from "@/lib/sports";
import { X_LAYER_EXPLORER_URL, xLayerTestnet } from "@/lib/arc";
import { errorMessage } from "@/lib/utils";
import { KickoffLoader, TopHeader } from "@/components/XCupApp";

type AgentMode = "signal" | "risk" | "settlement";

const configuredArenaAddress = process.env.NEXT_PUBLIC_XCUP_ARENA_ADDRESS;
const arenaAddress = configuredArenaAddress && isAddress(configuredArenaAddress) ? (configuredArenaAddress as `0x${string}`) : undefined;

const xCupArenaAbi = [
  {
    type: "function",
    name: "recordAgentBriefing",
    stateMutability: "nonpayable",
    inputs: [
      { name: "fixtureId", type: "bytes32" },
      { name: "briefingHash", type: "bytes32" }
    ],
    outputs: [{ name: "eventId", type: "uint256" }]
  }
] as const;

const fallbackBriefings = {
  signal: "Signal: wait for score pressure and clock state to align before locking a prediction. Thin live feeds should stay watch-only.",
  risk: "Risk: avoid stale fixtures, unclear market labels, and settlement claims that do not map to a verifiable feed.",
  settlement: "Settlement: write compact hashes of the selected fixture, mode, and recommendation before surfacing any explorer link."
};

export function AgentPage() {
  const [showLoader, setShowLoader] = useState(true);
  const [events, setEvents] = useState<LiveSportEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mode, setMode] = useState<AgentMode>("signal");
  const [selectedEventId, setSelectedEventId] = useState("");
  const [briefing, setBriefing] = useState(fallbackBriefings.signal);
  const [status, setStatus] = useState("Select a live fixture and generate a briefing.");
  const hydratedRef = useRef(false);
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({
    address,
    chainId: xLayerTestnet.id,
    query: { enabled: Boolean(address) }
  });
  const { connectors, connectAsync, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { writeContractAsync, isPending: isWriting } = useWriteContract();
  const formattedBalance = balance ? `${Number(formatUnits(balance.value, balance.decimals)).toFixed(4)} ${balance.symbol}` : "0.0000 OKB";

  useEffect(() => {
    const timer = window.setTimeout(() => setShowLoader(false), 1000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadEvents() {
      if (hydratedRef.current) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      try {
        const response = await fetch("/api/sports/live", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Live feed unavailable.");
        }
        const data = (await response.json()) as { events: LiveSportEvent[] };
        if (!cancelled) {
          setEvents(data.events);
          setSelectedEventId((current) => current || data.events[0]?.id || "");
          hydratedRef.current = true;
        }
      } catch (error) {
        if (!cancelled) {
          setStatus(error instanceof Error ? error.message : "Unable to load live fixtures.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    void loadEvents();
    const interval = window.setInterval(() => void loadEvents(), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? events[0] ?? null;

  async function connectWallet() {
    const connector = connectors[0];
    if (!connector) {
      setStatus("No wallet connector detected.");
      return;
    }
    try {
      await connectAsync({ connector, chainId: xLayerTestnet.id });
    } catch (error) {
      setStatus(errorMessage(error, "Wallet connection failed."));
    }
  }

  async function generateBriefing() {
    const fixtureName = selectedEvent ? formatLiveEventMatchup(selectedEvent) : "No live fixture";
    const nextBriefing =
      mode === "signal"
        ? `${fixtureName}: the cleanest signal is live pressure plus visible score movement. Keep sizing small until the feed confirms sustained momentum.`
        : mode === "risk"
          ? `${fixtureName}: risk is elevated if the market is only reacting to scoreline noise. Require clock context and settlement clarity before action.`
          : `${fixtureName}: settlement should hash fixture id, selected mode, and recommendation, then point users to X Layer only after wallet confirmation.`;

    setBriefing(nextBriefing);

    if (arenaAddress && selectedEvent && isConnected) {
      try {
        const txHash = await writeContractAsync({
          address: arenaAddress,
          abi: xCupArenaAbi,
          functionName: "recordAgentBriefing",
          args: [keccak256(toBytes(selectedEvent.id)), keccak256(toBytes(nextBriefing))],
          chainId: xLayerTestnet.id
        });
        setStatus(`Briefing recorded on X Layer. Tx ${txHash.slice(0, 10)}...`);
      } catch (error) {
        setStatus(errorMessage(error, "Briefing write failed."));
      }
    } else {
      setStatus(arenaAddress ? "Connect wallet to record this briefing on X Layer." : "Briefing generated locally. Configure NEXT_PUBLIC_XCUP_ARENA_ADDRESS for onchain writes.");
    }
  }

  return (
    <main className="x-cup-bg min-h-[100dvh] overflow-x-clip text-white">
      {showLoader ? <KickoffLoader onSkip={() => setShowLoader(false)} /> : null}
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[92rem] flex-col px-4 pb-8 pt-4 sm:px-6 lg:px-8">
        <TopHeader
          address={address}
          isConnected={isConnected}
          isPending={isPending}
          balance={formattedBalance}
          onConnect={() => void connectWallet()}
          onDisconnect={() => disconnect()}
        />
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="grid gap-4">
            <header className="relative overflow-hidden rounded-lg border border-white/10 bg-black p-4 sm:p-6">
              <div className="absolute inset-0 opacity-80">
                <div className="x-reference-grid" />
                <div className="x-reference-ribbon x-reference-ribbon-one x-motion-drift" />
                <div className="x-reference-ribbon x-reference-ribbon-three" />
              </div>
              <div className="relative z-10">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">AI Agent</p>
                <h1 className="mt-2 max-w-3xl text-4xl font-black leading-[1.02] tracking-normal text-white sm:text-5xl">
                  Match Oracle cockpit
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/62">
                  Generate fixture-aware prediction signal, risk notes, and settlement proofs without turning the Agent tab into Markets or Squads.
                </p>
              </div>
            </header>

            <section className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Live fixture</p>
                  <h2 className="mt-1 text-2xl font-black text-white">{selectedEvent ? formatLiveEventMatchup(selectedEvent) : loading ? "Loading fixtures" : "No live fixture"}</h2>
                </div>
                {refreshing ? <Radio size={18} className="animate-pulse text-[#18e3bd]" aria-hidden="true" /> : null}
              </div>
              <div className="mt-4 grid gap-2">
                {events.slice(0, 5).map((event) => (
                  <button
                    key={event.id}
                    className={`rounded-lg border p-3 text-left transition ${selectedEventId === event.id ? "border-white bg-white text-black" : "border-white/10 bg-black/35 text-white hover:bg-white/[0.07]"}`}
                    type="button"
                    onClick={() => setSelectedEventId(event.id)}
                  >
                    <span className="block text-[11px] font-black uppercase tracking-[0.16em] opacity-60">{event.league}</span>
                    <span className="mt-1 block font-black">{formatLiveEventMatchup(event)}</span>
                    <span className="mt-1 block text-xs font-bold opacity-60">{event.status.detail}</span>
                  </button>
                ))}
                {!loading && !events.length ? (
                  <div className="rounded-lg border border-white/10 bg-black/35 p-5 text-sm text-white/60">
                    No live fixture is available right now. The agent will keep refreshing without clearing this page.
                  </div>
                ) : null}
              </div>
            </section>

            <section className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
              <div className="grid grid-cols-3 gap-1 rounded-lg border border-white/10 bg-black/32 p-1">
                {(["signal", "risk", "settlement"] as const).map((item) => (
                  <button
                    key={item}
                    className={`rounded-md px-2 py-2 text-xs font-black capitalize transition ${mode === item ? "bg-white text-black" : "text-white/52 hover:bg-white/10 hover:text-white"}`}
                    type="button"
                    onClick={() => {
                      setMode(item);
                      setBriefing(fallbackBriefings[item]);
                    }}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <div className="mt-4 rounded-lg border border-white/10 bg-black/35 p-4">
                <p className="text-sm leading-7 text-white/76">{briefing}</p>
              </div>
              <button
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-white px-3 py-3 text-sm font-black text-black transition hover:bg-[#18e3bd] disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                disabled={isWriting}
                onClick={() => void generateBriefing()}
              >
                <Sparkles size={16} aria-hidden="true" />
                {isWriting ? "Recording" : "Generate briefing"}
              </button>
              <p className="mt-3 rounded-lg border border-white/10 bg-black/35 p-3 text-sm text-white/62">{status}</p>
            </section>
          </div>

          <aside className="grid content-start gap-4">
            <section className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Agent status</p>
                  <h2 className="mt-1 text-xl font-black text-white">Oracle online</h2>
                </div>
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-white text-black">
                  <Bot size={20} aria-hidden="true" />
                </span>
              </div>
              <div className="mt-4 grid gap-2">
                <Metric icon={Activity} label="Mode" value={mode} />
                <Metric icon={Gauge} label="Fixtures" value={String(events.length)} />
                <Metric icon={ShieldCheck} label="Contract" value={arenaAddress ? "Ready" : "Pending"} />
              </div>
            </section>

            <section className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Guardrails</p>
              <div className="mt-4 grid gap-3">
                {[
                  ["Verified feeds", "The agent only reacts to live event data loaded by the app."],
                  ["No auto execution", "Briefings prepare context; wallet actions stay explicit."],
                  ["Readable proof", "Hashes are compact and tied to fixture, mode, and recommendation."]
                ].map(([label, body]) => (
                  <motion.div key={label} className="rounded-lg border border-white/10 bg-black/35 p-3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <p className="flex items-center gap-2 font-black text-white">
                      <CheckCircle2 size={15} className="text-[#18e3bd]" aria-hidden="true" />
                      {label}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/58">{body}</p>
                  </motion.div>
                ))}
              </div>
            </section>

            {arenaAddress ? (
              <section className="rounded-lg border border-white/10 bg-black/35 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">X Layer</p>
                <p className="mt-2 break-all text-sm leading-6 text-white/60">{arenaAddress}</p>
                <a className="mt-3 inline-flex items-center gap-2 text-sm font-black text-[#18e3bd]" href={`${X_LAYER_EXPLORER_URL}/address/${arenaAddress}`} target="_blank" rel="noreferrer">
                  Open explorer
                  <ArrowRight size={14} aria-hidden="true" />
                </a>
              </section>
            ) : null}
          </aside>
        </section>
      </div>
    </main>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Brain; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/35 px-3 py-2">
      <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-white/38">
        <Icon size={14} className="text-[#18e3bd]" aria-hidden="true" />
        {label}
      </span>
      <span className="text-sm font-black capitalize text-white">{value}</span>
    </div>
  );
}
