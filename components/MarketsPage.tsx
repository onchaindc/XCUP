"use client";

import { motion } from "framer-motion";
import { AlertCircle, ArrowRight, CalendarClock, CheckCircle2, Radio, RefreshCw, Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatUnits, isAddress, keccak256, parseEther, toBytes } from "viem";
import { useAccount, useBalance, useConnect, useDisconnect, useWriteContract } from "wagmi";
import { formatEventTime, formatLiveEventMatchup, type LiveSportEvent, type PreviousFootballMatch } from "@/lib/sports";
import { X_LAYER_EXPLORER_URL, xLayerTestnet } from "@/lib/arc";
import { errorMessage } from "@/lib/utils";
import { pickWalletConnector } from "@/lib/wallet";
import { KickoffLoader, TopHeader } from "@/components/XCupApp";

type Slip = {
  event: LiveSportEvent;
  pick: string;
  amount: string;
};

type PredictionTicket = {
  id: string;
  eventName: string;
  pick: string;
  amount: string;
  createdAt: string;
  txHash?: `0x${string}`;
};

const configuredArenaAddress = process.env.NEXT_PUBLIC_XCUP_ARENA_ADDRESS;
const arenaAddress = configuredArenaAddress && isAddress(configuredArenaAddress) ? (configuredArenaAddress as `0x${string}`) : undefined;

const xCupArenaAbi = [
  {
    type: "function",
    name: "preparePrediction",
    stateMutability: "payable",
    inputs: [
      { name: "fixtureId", type: "bytes32" },
      { name: "marketId", type: "bytes32" },
      { name: "payloadHash", type: "bytes32" }
    ],
    outputs: [{ name: "eventId", type: "uint256" }]
  }
] as const;

export function MarketsPage() {
  const [events, setEvents] = useState<LiveSportEvent[]>([]);
  const [previousMatches, setPreviousMatches] = useState<PreviousFootballMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState<"live" | "previous">("live");
  const [sportFilter, setSportFilter] = useState("All");
  const [slip, setSlip] = useState<Slip | null>(null);
  const ticketsHydratedRef = useRef(false);
  const [tickets, setTickets] = useState<PredictionTicket[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }
    const stored = window.localStorage.getItem("xcup-prediction-tickets");
    if (!stored) {
      return [];
    }
    try {
      return JSON.parse(stored) as PredictionTicket[];
    } catch {
      return [];
    }
  });
  const [showLoader, setShowLoader] = useState(true);
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({
    address,
    chainId: xLayerTestnet.id,
    query: { enabled: Boolean(address) }
  });
  const { connectors, connectAsync, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const hydratedRef = useRef(false);
  const formattedBalance = balance ? `${Number(formatUnits(balance.value, balance.decimals)).toFixed(4)} ${balance.symbol}` : "0.0000 OKB";

  useEffect(() => {
    const timer = window.setTimeout(() => setShowLoader(false), 1000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ticketsHydratedRef.current) {
      ticketsHydratedRef.current = true;
      return;
    }
    window.localStorage.setItem("xcup-prediction-tickets", JSON.stringify(tickets));
  }, [tickets]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (hydratedRef.current) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError("");
      try {
        const response = await fetch("/api/sports/live", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Live markets feed is unavailable.");
        }
        const data = (await response.json()) as { events: LiveSportEvent[] };
        const previousResponse = await fetch("/api/sports/previous", { cache: "no-store" });
        const previousData = previousResponse.ok ? ((await previousResponse.json()) as { matches: PreviousFootballMatch[] }) : { matches: [] };
        if (!cancelled) {
          setEvents(data.events);
          setPreviousMatches(previousData.matches);
          hydratedRef.current = true;
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load live markets.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    void load();
    const interval = window.setInterval(() => void load(), 45_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const sports = useMemo(() => ["All", ...Array.from(new Set(events.map((event) => event.sport)))], [events]);
  const filteredEvents = events.filter((event) => {
    if (sportFilter !== "All" && event.sport !== sportFilter) {
      return false;
    }
    return true;
  });
  const liveCount = events.filter((event) => event.status.state === "in").length;

  async function connectWallet() {
    const connector = pickWalletConnector(connectors);
    if (!connector) {
      setError("No wallet connector detected.");
      return;
    }
    setError("");
    try {
      await connectAsync({ connector, chainId: xLayerTestnet.id });
    } catch (connectError) {
      setError(errorMessage(connectError, "Wallet connection failed."));
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
            <header className="rounded-lg border border-white/10 bg-white/[0.045] p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Markets</p>
                  <h1 className="mt-2 text-3xl font-black tracking-normal text-white sm:text-5xl">Live sports board</h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60">
                    Real live and scheduled events from sports feeds across football, basketball, cricket, baseball, hockey, tennis, MMA, and international fixtures.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <Stat label="Live" value={String(liveCount)} icon={Radio} />
                  <Stat label="Tracked" value={String(events.length)} icon={Trophy} />
                </div>
              </div>
              {refreshing ? <p className="mt-4 rounded-lg border border-[#18e3bd]/20 bg-[#18e3bd]/10 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-[#80ffe2]">Refreshing</p> : null}
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  className={`rounded-lg border px-3 py-2 text-xs font-black transition ${view === "live" ? "border-white bg-white text-black" : "border-white/10 bg-white/[0.05] text-white/62 hover:bg-white/10 hover:text-white"}`}
                  type="button"
                  onClick={() => setView("live")}
                >
                  Live matches
                </button>
                <button
                  className={`rounded-lg border px-3 py-2 text-xs font-black transition ${view === "previous" ? "border-white bg-white text-black" : "border-white/10 bg-white/[0.05] text-white/62 hover:bg-white/10 hover:text-white"}`}
                  type="button"
                  onClick={() => setView("previous")}
                >
                  Previous matches
                </button>
                {sports.map((sport) => (
                  <button
                    key={sport}
                    className={`rounded-lg border px-3 py-2 text-xs font-black transition ${sportFilter === sport ? "border-white bg-white text-black" : "border-white/10 bg-white/[0.05] text-white/62 hover:bg-white/10 hover:text-white"}`}
                    type="button"
                    onClick={() => setSportFilter(sport)}
                  >
                    {sport}
                  </button>
                ))}
              </div>
            </header>
            <section className="grid gap-3">
              {loading && !events.length && !previousMatches.length ? <LoadingRows /> : null}
              {!loading && error ? (
                <div className="rounded-lg border border-[#ff5c39]/25 bg-[#ff5c39]/10 p-4 text-sm font-bold text-[#ffb09d]">
                  {error}
                </div>
              ) : null}
              {!loading && !error && view === "live" && !filteredEvents.length ? (
                <div className="rounded-lg border border-white/10 bg-white/[0.045] p-6 text-center">
                  <AlertCircle className="mx-auto text-white/44" size={30} aria-hidden="true" />
                  <p className="mt-3 font-black text-white">No matching fixtures in the next 7 days.</p>
                  <p className="mt-2 text-sm leading-6 text-white/58">Try another sport filter or refresh the board.</p>
                </div>
              ) : null}
              {!loading && !error && view === "previous" && !previousMatches.length ? (
                <div className="rounded-lg border border-white/10 bg-white/[0.045] p-6 text-center">
                  <AlertCircle className="mx-auto text-white/44" size={30} aria-hidden="true" />
                  <p className="mt-3 font-black text-white">No finished football matches found in the last 2 days.</p>
                </div>
              ) : null}
              {!loading && view === "live" && filteredEvents.map((event) => (
                <MarketEventCard key={event.id} event={event} onPick={(pick) => setSlip({ event, pick, amount: "" })} />
              ))}
              {!loading && view === "previous" && previousMatches.map((match) => (
                <PreviousMatchCard key={match.id} match={match} />
              ))}
            </section>
          </div>
          <aside className="grid content-start gap-4">
            <PredictionSlip slip={slip} setSlip={setSlip} isConnected={isConnected} tickets={tickets} setTickets={setTickets} />
            <TicketHistory tickets={tickets} />
            <div className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">
                <RefreshCw size={14} aria-hidden="true" />
                Auto refresh
              </div>
              <p className="mt-3 text-sm leading-6 text-white/60">The board refreshes every 45 seconds and prioritizes World Cup, top football, NBA, cricket, NFL, MLB, NHL, tennis, and MMA feeds.</p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

function MarketEventCard({ event, onPick }: { event: LiveSportEvent; onPick: (pick: string) => void }) {
  const isLive = event.status.state === "in";
  const scheduledTime = formatEventTime(event);
  const homePick = `${event.homeTeam.shortName} win`;
  const awayPick = `${event.awayTeam.shortName} win`;

  return (
    <motion.article className="rounded-lg border border-white/10 bg-white/[0.045] p-4" layout>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">{event.sport} - {event.league}</p>
          <h2 className="mt-2 text-2xl font-black text-white">{formatLiveEventMatchup(event)}</h2>
          <p className="mt-2 flex items-center gap-2 text-sm text-white/58">
            <CalendarClock size={15} aria-hidden="true" />
            <span>{event.status.detail}{scheduledTime ? ` - ${isLive ? "Started" : "Kickoff"}: ${scheduledTime}` : ""}</span>
          </p>
        </div>
        <span className={`rounded-lg border px-2 py-1 text-[11px] font-black uppercase ${isLive ? "border-[#18e3bd]/30 bg-[#18e3bd]/10 text-[#80ffe2]" : "border-white/10 bg-white/[0.06] text-white/60"}`}>
          {isLive ? "Live" : event.status.state}
        </span>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <TeamBlock label="Away" name={event.awayTeam.name} score={event.awayTeam.score} logo={event.awayTeam.logo} />
        <TeamBlock label="Home" name={event.homeTeam.name} score={event.homeTeam.score} logo={event.homeTeam.logo} />
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {[awayPick, homePick, event.sport === "Football" ? "Draw" : "OT / close finish"].map((pick) => (
          <button key={pick} className="rounded-lg border border-white/10 bg-black/35 p-3 text-left transition hover:border-[#18e3bd]/35 hover:bg-[#18e3bd]/10" type="button" onClick={() => onPick(pick)}>
            <span className="block text-[11px] font-black uppercase tracking-[0.14em] text-white/42">Predict</span>
            <span className="mt-1 block text-sm font-black text-white">{pick}</span>
          </button>
        ))}
      </div>
      {isLive ? (
        <Link className="mt-3 flex w-fit items-center gap-2 rounded-lg border border-[#18e3bd]/30 bg-[#18e3bd]/10 px-3 py-2 text-sm font-black text-[#80ffe2] transition hover:bg-[#18e3bd]/18" href={`/matches/live?id=${encodeURIComponent(event.id)}`}>
          Open live details
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      ) : null}
      {!isLive ? <p className="mt-3 text-xs font-bold text-white/42">Scheduled fixture. Picks can be staged before kickoff.</p> : null}
    </motion.article>
  );
}

function TeamBlock({ label, name, score, logo }: { label: string; name: string; score?: string; logo?: string }) {
  const src = teamLogoSrc(name, logo);
  return (
    <div className="rounded-lg border border-white/10 bg-black/35 p-3">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white/38">{label}</p>
      <div className="mt-2 flex items-center gap-3">
        {src ? <img className="h-9 w-9 rounded-md object-contain" src={src} alt="" /> : null}
        <p className="font-black text-white">{name}</p>
      </div>
      {score ? <p className="mt-1 text-2xl font-black text-[#18e3bd]">{score}</p> : null}
    </div>
  );
}

function teamLogoSrc(name: string, logo?: string) {
  if (logo) return logo;
  const flags: Record<string, string> = {
    argentina: "ar",
    belgium: "be",
    brazil: "br",
    croatia: "hr",
    england: "gb-eng",
    france: "fr",
    germany: "de",
    ghana: "gh",
    italy: "it",
    mexico: "mx",
    morocco: "ma",
    netherlands: "nl",
    nigeria: "ng",
    portugal: "pt",
    senegal: "sn",
    spain: "es",
    "united states": "us",
    usa: "us"
  };
  const code = flags[name.toLowerCase()];
  return code ? `https://flagcdn.com/w80/${code}.png` : "";
}

function PreviousMatchCard({ match }: { match: PreviousFootballMatch }) {
  return (
    <motion.article className="rounded-lg border border-white/10 bg-white/[0.045] p-4" layout>
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">{match.league}</p>
      <h2 className="mt-2 text-2xl font-black text-white">{match.awayTeam.shortName} VS {match.homeTeam.shortName}</h2>
      <p className="mt-2 text-sm text-white/58">{match.status.detail} - {formatEventTime({ date: match.date })}</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <TeamBlock label="Away" name={match.awayTeam.name} score={match.awayTeam.score} logo={match.awayTeam.logo} />
        <TeamBlock label="Home" name={match.homeTeam.name} score={match.homeTeam.score} logo={match.homeTeam.logo} />
      </div>
      {match.goals.length ? (
        <div className="mt-4 grid gap-2">
          {match.goals.slice(0, 6).map((goal) => (
            <div key={goal.id} className="rounded-lg border border-white/10 bg-black/35 p-3">
              <p className="font-black text-white">{goal.athlete ?? goal.team ?? "Scoring play"} {goal.minute ? `- ${goal.minute}` : ""}</p>
              <p className="mt-1 text-sm text-white/58">{goal.text}</p>
            </div>
          ))}
        </div>
      ) : null}
      {match.stats.length ? (
        <div className="mt-4 grid gap-2">
          {match.stats.slice(0, 8).map((stat) => (
            <div key={stat.label} className="grid grid-cols-[4rem_1fr_4rem] items-center gap-3 rounded-lg border border-white/10 bg-black/35 p-3 text-sm">
              <p className="text-right font-black text-white">{stat.away}</p>
              <p className="text-center font-bold text-white/58">{stat.label}</p>
              <p className="font-black text-white">{stat.home}</p>
            </div>
          ))}
        </div>
      ) : null}
    </motion.article>
  );
}

function PredictionSlip({
  slip,
  setSlip,
  isConnected,
  tickets,
  setTickets
}: {
  slip: Slip | null;
  setSlip: (slip: Slip | null) => void;
  isConnected: boolean;
  tickets: PredictionTicket[];
  setTickets: (tickets: PredictionTicket[]) => void;
}) {
  const { writeContractAsync, isPending } = useWriteContract();
  const confirmedKey = slip ? `${slip.event.id}:${slip.pick}:${slip.amount}` : "";
  const [confirmedState, setConfirmedState] = useState<{ key: string; message: string } | null>(null);

  if (!slip) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Prediction Slip</p>
        <p className="mt-3 text-sm leading-6 text-white/60">Select a fixture prediction to open the slip.</p>
      </div>
    );
  }

  async function submitPrediction() {
    if (!slip || !Number(slip.amount)) {
      return;
    }

    const ticket: PredictionTicket = {
      id: crypto.randomUUID(),
      eventName: formatLiveEventMatchup(slip.event),
      pick: slip.pick,
      amount: slip.amount,
      createdAt: new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date())
    };

    if (arenaAddress) {
      setConfirmedState({ key: confirmedKey, message: "Confirm the prediction in your wallet." });
      try {
        const payloadHash = keccak256(toBytes(JSON.stringify({
          eventId: slip.event.id,
          eventName: formatLiveEventMatchup(slip.event),
          pick: slip.pick,
          amount: slip.amount,
          createdAt: ticket.createdAt
        })));
        const txHash = await writeContractAsync({
          address: arenaAddress,
          abi: xCupArenaAbi,
          functionName: "preparePrediction",
          args: [
            keccak256(toBytes(slip.event.id)),
            keccak256(toBytes(`${slip.event.id}:${slip.pick}`)),
            payloadHash
          ],
          value: parseEther(slip.amount),
          chainId: xLayerTestnet.id
        });
        ticket.txHash = txHash;
        setConfirmedState({ key: confirmedKey, message: "Prediction submitted on X Layer mainnet." });
      } catch (error) {
        setConfirmedState({ key: confirmedKey, message: errorMessage(error, "Prediction was not submitted.") });
        return;
      }
    } else {
      setConfirmedState({ key: confirmedKey, message: "Prediction locked for this live board session." });
    }

    setTickets([ticket, ...tickets].slice(0, 5));
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Prediction Slip</p>
      <h2 className="mt-2 text-xl font-black text-white">{slip.pick}</h2>
      <p className="mt-2 text-sm text-white/58">{formatLiveEventMatchup(slip.event)} - {slip.event.league}</p>
      <label className="mt-4 grid gap-2 text-sm font-bold text-white/58">
        Stake amount
        <input className="rounded-lg border border-white/10 bg-black/35 px-3 py-3 text-base font-black text-white outline-none focus:border-[#18e3bd]/60" value={slip.amount} onChange={(event) => setSlip({ ...slip, amount: event.target.value })} placeholder="0.00 OKB" />
      </label>
      <button
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-white px-3 py-3 text-sm font-black text-black transition hover:bg-[#18e3bd] disabled:cursor-not-allowed disabled:opacity-50"
        type="button"
        disabled={!isConnected || !Number(slip.amount) || isPending}
        onClick={() => void submitPrediction()}
      >
        <CheckCircle2 size={16} aria-hidden="true" />
        {isPending ? "Confirming" : "Lock Prediction"}
      </button>
      {confirmedState && confirmedState.key === confirmedKey ? <p className="mt-3 rounded-lg border border-[#18e3bd]/25 bg-[#18e3bd]/10 p-3 text-sm font-bold text-[#80ffe2]">{confirmedState.message}</p> : null}
      {!isConnected ? <p className="mt-3 text-xs font-bold text-white/44">Connect wallet to lock a prediction.</p> : null}
      <button className="mt-3 flex items-center gap-2 text-xs font-black text-white/44 transition hover:text-white" type="button" onClick={() => setSlip(null)}>
        Clear slip
        <ArrowRight size={13} aria-hidden="true" />
      </button>
    </div>
  );
}

function TicketHistory({ tickets }: { tickets: PredictionTicket[] }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">My Picks</p>
      <div className="mt-3 grid gap-2">
        {tickets.map((ticket) => (
          <article key={ticket.id} className="rounded-lg border border-white/10 bg-black/35 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-white">{ticket.pick}</p>
                <p className="mt-1 text-xs text-white/50">{ticket.eventName}</p>
              </div>
              <span className="shrink-0 rounded-md bg-white/[0.07] px-2 py-1 text-[11px] font-black text-white">{ticket.amount} OKB</span>
            </div>
            {ticket.txHash ? (
              <a className="mt-2 inline-flex text-[11px] font-black text-[#18e3bd] transition hover:text-white" href={`${X_LAYER_EXPLORER_URL}/tx/${ticket.txHash}`} target="_blank" rel="noreferrer">
                View X Layer transaction
              </a>
            ) : null}
            <p className="mt-2 text-[11px] font-bold text-white/38">{ticket.createdAt}</p>
          </article>
        ))}
        {!tickets.length ? <p className="text-sm leading-6 text-white/56">Locked picks from this session will appear here.</p> : null}
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Radio }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/35 p-3">
      <Icon size={15} className="text-[#18e3bd]" aria-hidden="true" />
      <p className="mt-2 text-[11px] font-black uppercase tracking-[0.16em] text-white/40">{label}</p>
      <p className="mt-1 text-xl font-black text-white">{value}</p>
    </div>
  );
}

function LoadingRows() {
  return (
    <>
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="h-48 animate-pulse rounded-lg border border-white/10 bg-white/[0.045]" />
      ))}
    </>
  );
}
