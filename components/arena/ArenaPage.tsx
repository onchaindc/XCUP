"use client";

import { motion } from "framer-motion";
import { Activity, ArrowRight, CheckCircle2, Coins, Flame, Medal, RefreshCw, ShieldCheck, Trophy, Wallet, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatUnits, keccak256, parseUnits, toBytes } from "viem";
import { useAccount, useBalance, useConnect, useDisconnect, useReadContract, useWriteContract } from "wagmi";
import { arenaChallengeAbi, arenaChallengeAddress, ARENA_ASSET_DECIMALS, ARENA_ASSET_ID, ARENA_OUTCOME_ID } from "@/lib/arena/contracts";
import type { ArenaAsset, ArenaConfidence, ArenaMatch, ArenaOutcome, ArenaSlip, ArenaStats, ArenaSport } from "@/lib/arena/types";
import { X_LAYER_EXPLORER_URL, xLayerMainnet } from "@/lib/arc";
import { errorMessage } from "@/lib/utils";
import { pickWalletConnector } from "@/lib/wallet";
import { KickoffLoader, TopHeader } from "@/components/XCupApp";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const STORAGE_SLIPS = "xcup-arena-challenge-slips";
const STORAGE_STATS = "xcup-arena-stats";
const confidenceXp: Record<ArenaConfidence, number> = { Low: 10, Medium: 20, High: 35 };
const outcomeLabels: Record<ArenaOutcome, string> = { HOME: "Home wins", DRAW: "Draw", AWAY: "Away wins" };
const sportFilters: Array<"All" | ArenaSport> = ["All", "Football", "Basketball", "Baseball", "Esports"];
const ranges = ["Weekly", "All-time"] as const;

function readStored<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function formatMatchTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Time pending";
  }
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function matchName(match: ArenaMatch) {
  return `${match.awayTeam} VS ${match.homeTeam}`;
}

function formatAmount(units: string, asset: ArenaAsset) {
  try {
    return formatUnits(BigInt(units), ARENA_ASSET_DECIMALS[asset]);
  } catch {
    return "0";
  }
}

export function ArenaPage() {
  const [showLoader, setShowLoader] = useState(true);
  const [matches, setMatches] = useState<ArenaMatch[]>([]);
  const [matchSource, setMatchSource] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<ArenaMatch | null>(null);
  const [sport, setSport] = useState<"All" | ArenaSport>("All");
  const [range, setRange] = useState<(typeof ranges)[number]>("Weekly");
  const [slips, setSlips] = useState<ArenaSlip[]>(() => readStored<ArenaSlip[]>(STORAGE_SLIPS, []));
  const [stats, setStats] = useState<ArenaStats>(() => readStored<ArenaStats>(STORAGE_STATS, { xp: 0, streak: 0, totalChallenges: 0 }));
  const [toast, setToast] = useState("");
  const { address, isConnected } = useAccount();
  const { connectors, connectAsync, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { writeContractAsync, isPending: isWriting } = useWriteContract();
  const challengeAddress = arenaChallengeAddress();
  const { data: balance } = useBalance({ address, chainId: xLayerMainnet.id, query: { enabled: Boolean(address) } });
  const { data: vaultBalance } = useReadContract({
    address: challengeAddress,
    abi: arenaChallengeAbi,
    functionName: "vaultBalance",
    chainId: xLayerMainnet.id,
    query: { enabled: Boolean(challengeAddress) }
  });
  useReadContract({
    address: challengeAddress,
    abi: arenaChallengeAbi,
    functionName: "getUserSlips",
    args: address ? [address] : undefined,
    chainId: xLayerMainnet.id,
    query: { enabled: Boolean(challengeAddress && address) }
  });
  const formattedBalance = balance ? `${Number(formatUnits(balance.value, balance.decimals)).toFixed(4)} ${balance.symbol}` : "0.0000 OKB";
  const visibleMatches = matches.filter((match) => sport === "All" || match.sport === sport);
  const activeSlips = slips.filter((slip) => slip.status === "PENDING" || slip.status === "LOCKED");

  useEffect(() => {
    const timer = window.setTimeout(() => setShowLoader(false), 800);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_SLIPS, JSON.stringify(slips));
  }, [slips]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_STATS, JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    void loadMatches(false);
    const interval = window.setInterval(() => void loadMatches(true), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    async function refreshResults() {
      const pending = slips.filter((slip) => slip.status === "LOCKED");
      if (!pending.length) {
        return;
      }
      const updates = await Promise.all(
        pending.map(async (slip) => {
          const response = await fetch(`/api/arena/results?matchId=${encodeURIComponent(slip.matchId)}`, { cache: "no-store" }).catch(() => null);
          if (!response?.ok) {
            return slip;
          }
          const result = (await response.json()) as { status: string; result: ArenaOutcome | null };
          if (result.status !== "final" || !result.result) {
            return slip;
          }
          const won = result.result === slip.predictedOutcome;
          if (won) {
            setStats((current) => ({
              xp: current.xp + confidenceXp[slip.confidence],
              streak: current.streak + 1,
              totalChallenges: current.totalChallenges
            }));
          } else {
            setStats((current) => ({ ...current, streak: 0 }));
          }
          return { ...slip, status: won ? "WON" : "LOST", actualResult: result.result } satisfies ArenaSlip;
        })
      );
      setSlips((current) => current.map((slip) => updates.find((item) => item.id === slip.id) ?? slip));
    }
    const interval = window.setInterval(() => void refreshResults(), 45_000);
    void refreshResults();
    return () => window.clearInterval(interval);
  }, [slips]);

  async function loadMatches(silent: boolean) {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const response = await fetch("/api/arena/matches", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Arena schedule unavailable.");
      }
      const data = (await response.json()) as { matches: ArenaMatch[]; source?: string };
      setMatches(data.matches);
      setMatchSource(data.source ?? "");
    } catch (error) {
      setToast(errorMessage(error, "Unable to load arena matches."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function connectWallet() {
    const connector = pickWalletConnector(connectors);
    if (!connector) {
      setToast("No wallet connector detected.");
      return;
    }
    try {
      await connectAsync({ connector, chainId: xLayerMainnet.id });
    } catch (error) {
      setToast(errorMessage(error, "Wallet connection failed."));
    }
  }

  async function lockChallenge(input: {
    match: ArenaMatch;
    outcome: ArenaOutcome;
    confidence: ArenaConfidence;
    reasoning: string;
    amount: string;
    asset: ArenaAsset;
  }) {
    if (!challengeAddress) {
      setToast("Configure NEXT_PUBLIC_XCUP_ARENA_ADDRESS before locking challenges.");
      return;
    }
    const amountUnits = parseUnits(input.amount, ARENA_ASSET_DECIMALS[input.asset]);
    const localSlip: ArenaSlip = {
      id: crypto.randomUUID(),
      matchId: input.match.id,
      matchName: matchName(input.match),
      sport: input.match.sport,
      predictedOutcome: input.outcome,
      confidence: input.confidence,
      reasoning: input.reasoning,
      asset: input.asset,
      amount: input.amount,
      amountUnits: amountUnits.toString(),
      status: "PENDING",
      createdAt: new Date().toISOString()
    };
    setSlips((current) => [localSlip, ...current]);
    setStats((current) => ({ ...current, totalChallenges: current.totalChallenges + 1 }));
    setToast("Challenge pending. Confirm in your wallet.");
    try {
      const txHash = await writeContractAsync({
        address: challengeAddress,
        abi: arenaChallengeAbi,
        functionName: "lockChallenge",
        args: [keccak256(toBytes(input.match.id)), ARENA_OUTCOME_ID[input.outcome], amountUnits, ARENA_ASSET_ID[input.asset]],
        value: input.asset === "OKB" ? amountUnits : BigInt(0),
        chainId: xLayerMainnet.id
      });
      setSlips((current) => current.map((slip) => (slip.id === localSlip.id ? { ...slip, status: "LOCKED", txHash } : slip)));
      setToast("Challenge locked on X Layer mainnet.");
      setSelectedMatch(null);
    } catch (error) {
      setSlips((current) => current.filter((slip) => slip.id !== localSlip.id));
      setStats((current) => ({ ...current, totalChallenges: Math.max(0, current.totalChallenges - 1) }));
      setToast(errorMessage(error, "Challenge was not locked."));
    }
  }

  async function exitSlip(slip: ArenaSlip) {
    if (!challengeAddress) {
      setToast("Configure the arena contract address first.");
      return;
    }
    try {
      const txHash = await writeContractAsync({
        address: challengeAddress,
        abi: arenaChallengeAbi,
        functionName: "exitChallenge",
        args: [BigInt(`0x${slip.id.replaceAll("-", "").slice(0, 12)}`)],
        chainId: xLayerMainnet.id
      });
      setSlips((current) => current.map((item) => (item.id === slip.id ? { ...item, status: "EXITED", txHash } : item)));
      setToast("Challenge exited.");
    } catch (error) {
      setToast(errorMessage(error, "Exit failed."));
    }
  }

  async function claimSlip(slip: ArenaSlip) {
    if (!challengeAddress) {
      setToast("Configure the arena contract address first.");
      return;
    }
    try {
      await writeContractAsync({
        address: challengeAddress,
        abi: arenaChallengeAbi,
        functionName: "claimReward",
        args: [BigInt(`0x${slip.id.replaceAll("-", "").slice(0, 12)}`)],
        chainId: xLayerMainnet.id
      });
      setSlips((current) => current.map((item) => (item.id === slip.id ? { ...item, rewardClaimed: true } : item)));
      setToast("Reward claim submitted.");
    } catch (error) {
      setToast(errorMessage(error, "Reward claim failed."));
    }
  }

  return (
    <main className="x-cup-bg min-h-[100dvh] overflow-x-clip text-white">
      {showLoader ? <KickoffLoader onSkip={() => setShowLoader(false)} /> : null}
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[92rem] flex-col px-4 pb-8 pt-4 sm:px-6 lg:px-8">
        <TopHeader address={address} isConnected={isConnected} isPending={isPending} balance={formattedBalance} onConnect={() => void connectWallet()} onDisconnect={() => disconnect()} />
        {toast ? <Toast message={toast} onClose={() => setToast("")} /> : null}
        <ArenaHero stats={stats} vaultBalance={vaultBalance} />
        <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.045] p-3">
              <div className="flex flex-wrap gap-2">
                {sportFilters.map((item) => (
                  <button key={item} className={`rounded-lg border px-3 py-2 text-xs font-black transition ${sport === item ? "border-white bg-white text-black" : "border-white/10 bg-white/[0.05] text-white/62 hover:bg-white/10 hover:text-white"}`} type="button" onClick={() => setSport(item)}>
                    {item}
                  </button>
                ))}
              </div>
              <Button variant="secondary" size="sm" onClick={() => void loadMatches(true)} disabled={refreshing}>
                <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} aria-hidden="true" />
                Refresh
              </Button>
            </div>
            <section className="grid gap-3 md:grid-cols-2">
              {matchSource === "mock" ? (
                <Card className="border-[#f5a524]/20 bg-[#f5a524]/10 p-4 text-sm font-bold text-[#ffd88a] md:col-span-2">
                  Demo schedule shown because no live provider fixtures are available.
                </Card>
              ) : null}
              {loading ? <SkeletonCards /> : null}
              {!loading && visibleMatches.map((match) => <MatchCard key={match.id} match={match} onEnter={() => setSelectedMatch(match)} />)}
              {!loading && !visibleMatches.length ? (
                <Card className="p-6 text-center md:col-span-2">
                  <p className="font-black text-white">No arena matches found.</p>
                  <p className="mt-2 text-sm text-muted">Refresh or choose another sport.</p>
                </Card>
              ) : null}
            </section>
          </div>
          <aside className="grid content-start gap-4">
            <MySlips slips={slips} onExit={(slip) => void exitSlip(slip)} onClaim={(slip) => void claimSlip(slip)} busy={isWriting} />
            <ArenaLeaderboard slips={slips} stats={stats} sport={sport} range={range} setRange={setRange} />
          </aside>
        </section>
      </div>
      {selectedMatch ? (
        <ChallengeModal match={selectedMatch} isConnected={isConnected} busy={isWriting} onClose={() => setSelectedMatch(null)} onConnect={() => void connectWallet()} onLock={(input) => void lockChallenge(input)} />
      ) : null}
    </main>
  );
}

function ArenaHero({ stats, vaultBalance }: { stats: ArenaStats; vaultBalance?: bigint }) {
  return (
    <section className="rounded-lg border border-white/10 bg-black p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Performance Arena</p>
          <h1 className="mt-2 text-3xl font-black tracking-normal text-white sm:text-5xl">Skill-based prediction challenges</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/60">
            Lock collateral, submit a match read, and compete for XP, streaks, and vault-backed rewards on X Layer mainnet.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <Metric icon={Medal} label="XP" value={String(stats.xp)} />
          <Metric icon={Flame} label="Streak" value={String(stats.streak)} />
          <Metric icon={Activity} label="Total" value={String(stats.totalChallenges)} />
          <Metric icon={Coins} label="Vault" value={vaultBalance === undefined ? "Syncing" : `${Number(formatUnits(vaultBalance, 18)).toFixed(2)} OKB`} />
        </div>
      </div>
    </section>
  );
}

function MatchCard({ match, onEnter }: { match: ArenaMatch; onEnter: () => void }) {
  return (
    <motion.article className="rounded-lg border border-white/10 bg-white/[0.045] p-4" layout>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#18e3bd]">{match.sport} - {match.league}</p>
          <h2 className="mt-2 text-xl font-black text-white">{matchName(match)}</h2>
          <p className="mt-2 text-sm text-white/58">{formatMatchTime(match.startTime)}</p>
        </div>
        <Badge className={match.status === "live" ? "border-[#18e3bd]/25 bg-[#18e3bd]/10 text-[#80ffe2]" : "border-white/10 bg-white/[0.06] text-white/65"}>{match.status}</Badge>
      </div>
      <Button className="mt-4 w-full" onClick={onEnter}>
        Enter Challenge
        <ArrowRight size={16} aria-hidden="true" />
      </Button>
    </motion.article>
  );
}

function ChallengeModal({
  match,
  isConnected,
  busy,
  onClose,
  onConnect,
  onLock
}: {
  match: ArenaMatch;
  isConnected: boolean;
  busy: boolean;
  onClose: () => void;
  onConnect: () => void;
  onLock: (input: { match: ArenaMatch; outcome: ArenaOutcome; confidence: ArenaConfidence; reasoning: string; amount: string; asset: ArenaAsset }) => void;
}) {
  const [outcome, setOutcome] = useState<ArenaOutcome>("HOME");
  const [confidence, setConfidence] = useState<ArenaConfidence>("Medium");
  const [reasoning, setReasoning] = useState("");
  const [amount, setAmount] = useState("10");
  const [asset, setAsset] = useState<ArenaAsset>("OKB");
  const validAmount = Number(amount) > 0;

  return (
    <div className="fixed inset-0 z-[90] grid place-items-end bg-black/65 p-3 backdrop-blur-sm sm:place-items-center" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <Card className="max-h-[92dvh] w-full max-w-xl overflow-y-auto p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#18e3bd]">{match.sport} Challenge</p>
            <h2 className="mt-2 text-2xl font-black text-white">{matchName(match)}</h2>
            <p className="mt-1 text-sm text-muted">{formatMatchTime(match.startTime)} - {match.league}</p>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close challenge modal">
            <X size={18} aria-hidden="true" />
          </Button>
        </div>
        <div className="mt-5 grid gap-4">
          <Segment label="Outcome" options={[["HOME", `${match.homeTeam} wins`], ["DRAW", "Draw"], ["AWAY", `${match.awayTeam} wins`]]} value={outcome} onChange={(value) => setOutcome(value as ArenaOutcome)} />
          <Segment label="Confidence" options={["Low", "Medium", "High"].map((item) => [item, `${item} - ${confidenceXp[item as ArenaConfidence]} XP`])} value={confidence} onChange={(value) => setConfidence(value as ArenaConfidence)} />
          <label className="grid gap-2 text-sm font-bold text-muted">
            Match reasoning
            <textarea className="min-h-24 rounded-lg border border-white/10 bg-black/35 px-3 py-3 text-white outline-none focus:border-[#18e3bd]/60" value={reasoning} onChange={(event) => setReasoning(event.target.value)} placeholder="Your read on form, lineup, pace, or matchup edge" />
          </label>
          <div>
            <p className="text-sm font-bold text-muted">Amount</p>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {["5", "10", "25", "100"].map((preset) => (
                <button key={preset} className={`rounded-lg border px-3 py-2 text-sm font-black ${amount === preset ? "border-white bg-white text-black" : "border-white/10 bg-white/[0.05] text-white/70"}`} type="button" onClick={() => setAmount(preset)}>
                  ${preset}
                </button>
              ))}
            </div>
            <input className="mt-2 w-full rounded-lg border border-white/10 bg-black/35 px-3 py-3 text-white outline-none focus:border-[#18e3bd]/60" value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="Custom amount" />
          </div>
          <Segment label="Asset" options={[["OKB", "OKB"], ["USDC", "USDC"]]} value={asset} onChange={(value) => setAsset(value as ArenaAsset)} />
          <div className="rounded-lg border border-[#18e3bd]/20 bg-[#18e3bd]/10 p-3 text-sm font-bold text-[#80ffe2]">If correct: +30% reward. If wrong: -10% fee only.</div>
          <Button onClick={() => (isConnected ? onLock({ match, outcome, confidence, reasoning, amount, asset }) : onConnect())} disabled={busy || !validAmount}>
            <Wallet size={18} aria-hidden="true" />
            {isConnected ? (busy ? "Locking..." : "Lock Challenge") : "Connect Wallet"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function Segment({ label, options, value, onChange }: { label: string; options: string[][]; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <p className="text-sm font-bold text-muted">{label}</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        {options.map(([id, text]) => (
          <button key={id} className={`rounded-lg border px-3 py-3 text-sm font-black transition ${value === id ? "border-white bg-white text-black" : "border-white/10 bg-white/[0.05] text-white/70 hover:bg-white/10"}`} type="button" onClick={() => onChange(id)}>
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

function MySlips({ slips, busy, onExit, onClaim }: { slips: ArenaSlip[]; busy: boolean; onExit: (slip: ArenaSlip) => void; onClaim: (slip: ArenaSlip) => void }) {
  const [tab, setTab] = useState<"Active" | "Past">("Active");
  const filtered = slips.filter((slip) => (tab === "Active" ? slip.status === "PENDING" || slip.status === "LOCKED" : slip.status !== "PENDING" && slip.status !== "LOCKED"));
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-black">My Slips</h2>
        <div className="rounded-lg border border-white/10 bg-black/25 p-1">
          {["Active", "Past"].map((item) => (
            <button key={item} className={`rounded-md px-2 py-1 text-xs font-black ${tab === item ? "bg-white text-black" : "text-white/58"}`} type="button" onClick={() => setTab(item as "Active" | "Past")}>
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 grid gap-2">
        {filtered.map((slip) => (
          <div key={slip.id} className="rounded-lg border border-white/10 bg-black/25 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black text-white">{slip.matchName}</p>
                <p className="mt-1 text-xs text-muted">{formatAmount(slip.amountUnits, slip.asset)} {slip.asset} - {outcomeLabels[slip.predictedOutcome]}</p>
              </div>
              <Badge>{slip.status}</Badge>
            </div>
            {slip.actualResult ? <p className="mt-2 text-xs text-white/60">Actual: {outcomeLabels[slip.actualResult]}</p> : null}
            {slip.txHash ? <a className="mt-2 inline-flex text-xs font-bold text-[#18e3bd]" href={`${X_LAYER_EXPLORER_URL}/tx/${slip.txHash}`} target="_blank" rel="noreferrer">View tx</a> : null}
            <div className="mt-3 flex gap-2">
              {slip.status === "LOCKED" ? <Button size="sm" variant="secondary" disabled={busy} onClick={() => onExit(slip)}>Early Exit</Button> : null}
              {slip.status === "WON" && !slip.rewardClaimed ? <Button size="sm" disabled={busy} onClick={() => onClaim(slip)}>Claim Reward</Button> : null}
              {slip.rewardClaimed ? <span className="inline-flex items-center gap-1 text-xs font-bold text-gain"><CheckCircle2 size={14} />Reward claimed</span> : null}
            </div>
          </div>
        ))}
        {!filtered.length ? <p className="rounded-lg border border-white/10 bg-black/25 p-4 text-sm text-muted">No {tab.toLowerCase()} challenge slips yet.</p> : null}
      </div>
    </Card>
  );
}

function ArenaLeaderboard({ slips, stats, sport, range, setRange }: { slips: ArenaSlip[]; stats: ArenaStats; sport: "All" | ArenaSport; range: "Weekly" | "All-time"; setRange: (range: "Weekly" | "All-time") => void }) {
  const rows = useMemo(() => {
    const scoped = sport === "All" ? slips : slips.filter((slip) => slip.sport === sport);
    return [
      { name: "You", xp: stats.xp, streak: stats.streak, total: scoped.length },
      { name: "0xArena7", xp: 220, streak: 5, total: 18 },
      { name: "SignalDAO", xp: 180, streak: 3, total: 15 },
      { name: "MatchReader", xp: 135, streak: 2, total: 11 }
    ].sort((a, b) => b.xp - a.xp || b.streak - a.streak || b.total - a.total);
  }, [slips, sport, stats]);
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-black">Leaderboard</h2>
        <select className="rounded-lg border border-white/10 bg-black/35 px-2 py-2 text-xs font-black text-white outline-none" value={range} onChange={(event) => setRange(event.target.value as "Weekly" | "All-time")}>
          {ranges.map((item) => <option key={item} className="bg-surface">{item}</option>)}
        </select>
      </div>
      <div className="mt-4 grid gap-2">
        {rows.map((row, index) => (
          <div key={row.name} className="grid grid-cols-[2rem_1fr_auto] items-center gap-2 rounded-lg border border-white/10 bg-black/25 p-2 text-sm">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-xs font-black text-black">{index + 1}</span>
            <div>
              <p className="font-black text-white">{row.name}</p>
              <p className="text-xs text-muted">{row.streak} streak - {row.total} challenges</p>
            </div>
            <span className="font-black text-[#18e3bd]">{row.xp} XP</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Trophy; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.045] p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/42">{label}</p>
        <Icon size={14} className="text-[#18e3bd]" aria-hidden="true" />
      </div>
      <p className="mt-2 truncate text-lg font-black text-white">{value}</p>
    </div>
  );
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.07] px-4 py-3 text-sm font-bold text-white">
      <span>{message}</span>
      <button type="button" onClick={onClose} aria-label="Dismiss message"><X size={16} /></button>
    </div>
  );
}

function SkeletonCards() {
  return (
    <>
      {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-44 animate-pulse rounded-lg border border-white/10 bg-white/[0.045]" />)}
    </>
  );
}
