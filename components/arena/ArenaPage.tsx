"use client";

import { motion } from "framer-motion";
import { Activity, ArrowRight, CheckCircle2, Coins, Flame, Medal, Newspaper, RefreshCw, ShieldCheck, Trophy, Wallet, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatUnits, keccak256, parseEventLogs, parseUnits, toBytes } from "viem";
import { useAccount, useBalance, useConnect, useDisconnect, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { arenaChallengeAbi, arenaChallengeAddress, ARENA_ASSET_DECIMALS, ARENA_ASSET_ID, ARENA_OUTCOME_ID, erc20Abi, usdcAddress } from "@/lib/arena/contracts";
import type { ArenaAsset, ArenaConfidence, ArenaMatch, ArenaOutcome, ArenaSlip, ArenaStats, ArenaSport } from "@/lib/arena/types";
import { X_LAYER_EXPLORER_URL, xLayerMainnet } from "@/lib/arc";
import type { SportsNewsItem } from "@/lib/sports";
import { errorMessage } from "@/lib/utils";
import { pickWalletConnector } from "@/lib/wallet";
import { WalletGate } from "@/components/WalletGate";
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
const chainStatusMap = ["LOCKED", "WON", "LOST", "EXITED"] as const;
const chainOutcomeMap: ArenaOutcome[] = ["HOME", "DRAW", "AWAY"];

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

function displayError(error: unknown, fallback: string) {
  const message = errorMessage(error, fallback);
  return /user rejected|rejected the request|denied|declined|4001/i.test(message) ? "Transaction declined." : fallback;
}

export function ArenaPage() {
  const [showLoader, setShowLoader] = useState(true);
  const [matches, setMatches] = useState<ArenaMatch[]>([]);
  const [matchSource, setMatchSource] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<ArenaMatch | null>(null);
  const [news, setNews] = useState<SportsNewsItem[]>([]);
  const [sport, setSport] = useState<"All" | ArenaSport>("All");
  const [range, setRange] = useState<(typeof ranges)[number]>("Weekly");
  const [slips, setSlips] = useState<ArenaSlip[]>(() => readStored<ArenaSlip[]>(STORAGE_SLIPS, []));
  const [stats, setStats] = useState<ArenaStats>(() => readStored<ArenaStats>(STORAGE_STATS, { xp: 0, streak: 0, totalChallenges: 0 }));
  const [toast, setToast] = useState("");
  const { address, isConnected } = useAccount();
  const { connectors, connectAsync, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { writeContractAsync, isPending: isWriting } = useWriteContract();
  const publicClient = usePublicClient({ chainId: xLayerMainnet.id });
  const challengeAddress = arenaChallengeAddress();
  const configuredUsdc = usdcAddress();
  const { data: balance } = useBalance({ address, chainId: xLayerMainnet.id, query: { enabled: Boolean(address) } });
  const { data: vaultBalance } = useReadContract({
    address: challengeAddress,
    abi: arenaChallengeAbi,
    functionName: "vaultBalance",
    chainId: xLayerMainnet.id,
    query: { enabled: Boolean(challengeAddress) }
  });
  const { data: usdcVaultBalance } = useReadContract({
    address: challengeAddress,
    abi: arenaChallengeAbi,
    functionName: "usdcVaultBalance",
    chainId: xLayerMainnet.id,
    query: { enabled: Boolean(challengeAddress) }
  });
  const { data: vaultOwner } = useReadContract({
    address: challengeAddress,
    abi: arenaChallengeAbi,
    functionName: "owner",
    chainId: xLayerMainnet.id,
    query: { enabled: Boolean(challengeAddress) }
  });
  const { data: vaultResolver } = useReadContract({
    address: challengeAddress,
    abi: arenaChallengeAbi,
    functionName: "resolver",
    chainId: xLayerMainnet.id,
    query: { enabled: Boolean(challengeAddress) }
  });
  const { data: userSlips } = useReadContract({
    address: challengeAddress,
    abi: arenaChallengeAbi,
    functionName: "getUserSlips",
    args: address ? [address] : undefined,
    chainId: xLayerMainnet.id,
    query: { enabled: Boolean(challengeAddress && address) }
  });
  const formattedBalance = balance ? `${Number(formatUnits(balance.value, balance.decimals)).toFixed(4)} ${balance.symbol}` : "0.0000 OKB";
  const visibleMatches = matches.filter((match) => sport === "All" || match.sport === sport);
  const isVaultOwner = Boolean(address && vaultOwner && address.toLowerCase() === vaultOwner.toLowerCase());
  const isVaultResolver = Boolean(address && vaultResolver && address.toLowerCase() === vaultResolver.toLowerCase());

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
    let cancelled = false;
    async function loadNews() {
      try {
        const response = await fetch("/api/sports/news", { cache: "no-store" });
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as { items: SportsNewsItem[] };
        if (!cancelled) {
          setNews(data.items);
        }
      } catch {
        if (!cancelled) {
          setNews([]);
        }
      }
    }
    void loadNews();
    const interval = window.setInterval(() => void loadNews(), 120_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!userSlips?.length) {
      return;
    }
    setSlips((current) => {
      const byChainId = new Map(current.filter((slip) => slip.chainSlipId).map((slip) => [slip.chainSlipId!, slip]));
      const merged = userSlips.map((slip) => {
        const chainSlipId = slip.id.toString();
        const existing = byChainId.get(chainSlipId);
        const matchedArena = matches.find((match) => keccak256(toBytes(match.id)) === slip.matchId);
        return {
          id: existing?.id ?? `chain-${chainSlipId}`,
          chainSlipId,
          matchId: matchedArena?.id ?? existing?.matchId ?? slip.matchId,
          matchName: matchedArena ? matchName(matchedArena) : existing?.matchName ?? `Match ${slip.matchId.slice(0, 10)}...`,
          sport: matchedArena?.sport ?? existing?.sport ?? "Football",
          league: matchedArena?.league ?? existing?.league,
          matchStartTime: matchedArena?.startTime ?? existing?.matchStartTime,
          matchStatus: matchedArena?.status ?? existing?.matchStatus,
          predictedOutcome: chainOutcomeMap[Number(slip.outcome)] ?? "HOME",
          confidence: existing?.confidence ?? "Medium",
          reasoning: existing?.reasoning ?? "",
          asset: Number(slip.asset) === 1 ? "USDC" : "OKB",
          amount: existing?.amount ?? formatUnits(slip.amount, Number(slip.asset) === 1 ? ARENA_ASSET_DECIMALS.USDC : ARENA_ASSET_DECIMALS.OKB),
          amountUnits: slip.amount.toString(),
          status: chainStatusMap[Number(slip.status)] ?? "LOCKED",
          txHash: existing?.txHash,
          actualResult: existing?.actualResult,
          rewardClaimed: slip.rewardClaimed,
          createdAt: existing?.createdAt ?? new Date(Number(slip.createdAt) * 1000).toISOString()
        } satisfies ArenaSlip;
      });
      const mergedIds = new Set(merged.map((slip) => slip.chainSlipId));
      const pendingLocal = current.filter((slip) => !slip.chainSlipId || !mergedIds.has(slip.chainSlipId));
      return [...pendingLocal, ...merged].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    });
  }, [matches, userSlips]);

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
      setToast(displayError(error, "Unable to load arena matches."));
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
      setToast(displayError(error, "Wallet connection failed."));
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
      setToast("Configure NEXT_PUBLIC_XCUP_CHALLENGE_VAULT_ADDRESS before locking challenges.");
      return;
    }
    if (input.asset === "USDC" && !configuredUsdc) {
      setToast("Configure NEXT_PUBLIC_X_LAYER_USDC_ADDRESS before using USDC.");
      return;
    }
    const amountUnits = parseUnits(input.amount, ARENA_ASSET_DECIMALS[input.asset]);
    const localSlip: ArenaSlip = {
      id: crypto.randomUUID(),
      matchId: input.match.id,
      matchName: matchName(input.match),
      sport: input.match.sport,
      league: input.match.league,
      matchStartTime: input.match.startTime,
      matchStatus: input.match.status,
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
      if (input.asset === "USDC" && configuredUsdc) {
        setToast("Approve USDC spend in your wallet.");
        const approvalHash = await writeContractAsync({
          address: configuredUsdc,
          abi: erc20Abi,
          functionName: "approve",
          args: [challengeAddress, amountUnits],
          chainId: xLayerMainnet.id
        });
        await publicClient?.waitForTransactionReceipt({ hash: approvalHash });
        setToast("USDC approved. Confirm challenge lock.");
      }
      const txHash = await writeContractAsync({
        address: challengeAddress,
        abi: arenaChallengeAbi,
        functionName: "lockChallenge",
        args: [keccak256(toBytes(input.match.id)), ARENA_OUTCOME_ID[input.outcome], amountUnits, ARENA_ASSET_ID[input.asset]],
        value: input.asset === "OKB" ? amountUnits : BigInt(0),
        chainId: xLayerMainnet.id
      });
      const receipt = await publicClient?.waitForTransactionReceipt({ hash: txHash });
      const created = receipt
        ? parseEventLogs({
            abi: arenaChallengeAbi,
            logs: receipt.logs,
            eventName: "ChallengeCreated"
          })[0]
        : undefined;
      const chainSlipId = created?.args.slipId?.toString();
      setSlips((current) => current.map((slip) => (slip.id === localSlip.id ? { ...slip, chainSlipId, status: "LOCKED", txHash } : slip)));
      setToast("Challenge locked on X Layer mainnet.");
      setSelectedMatch(null);
    } catch (error) {
      setSlips((current) => current.filter((slip) => slip.id !== localSlip.id));
      setStats((current) => ({ ...current, totalChallenges: Math.max(0, current.totalChallenges - 1) }));
      setToast(displayError(error, "Challenge was not locked."));
    }
  }

  async function exitSlip(slip: ArenaSlip) {
    if (!challengeAddress) {
      setToast("Configure the arena contract address first.");
      return;
    }
    if (!slip.chainSlipId) {
      setToast("Challenge is still indexing. Try again in a moment.");
      return;
    }
    try {
      const txHash = await writeContractAsync({
        address: challengeAddress,
        abi: arenaChallengeAbi,
        functionName: "exitChallenge",
        args: [BigInt(slip.chainSlipId)],
        chainId: xLayerMainnet.id
      });
      setSlips((current) => current.map((item) => (item.id === slip.id ? { ...item, status: "EXITED", txHash } : item)));
      setToast("Collateral withdrawal submitted.");
    } catch (error) {
      setToast(displayError(error, "Withdrawal failed."));
    }
  }

  async function claimSlip(slip: ArenaSlip) {
    if (!challengeAddress) {
      setToast("Configure the arena contract address first.");
      return;
    }
    if (!slip.chainSlipId) {
      setToast("Challenge is still indexing. Try again in a moment.");
      return;
    }
    try {
      await writeContractAsync({
        address: challengeAddress,
        abi: arenaChallengeAbi,
        functionName: "claimReward",
        args: [BigInt(slip.chainSlipId)],
        chainId: xLayerMainnet.id
      });
      setSlips((current) => current.map((item) => (item.id === slip.id ? { ...item, rewardClaimed: true } : item)));
      setToast("Reward claim submitted.");
    } catch (error) {
      setToast(displayError(error, "Reward claim failed."));
    }
  }

  async function fundVault(amount: string, asset: ArenaAsset) {
    if (!challengeAddress) {
      setToast("Configure the vault address first.");
      return;
    }
    if (asset === "USDC" && !configuredUsdc) {
      setToast("Configure NEXT_PUBLIC_X_LAYER_USDC_ADDRESS before funding USDC.");
      return;
    }
    try {
      const amountUnits = parseUnits(amount, ARENA_ASSET_DECIMALS[asset]);
      if (asset === "USDC" && configuredUsdc) {
        const approvalHash = await writeContractAsync({
          address: configuredUsdc,
          abi: erc20Abi,
          functionName: "approve",
          args: [challengeAddress, amountUnits],
          chainId: xLayerMainnet.id
        });
        await publicClient?.waitForTransactionReceipt({ hash: approvalHash });
        await writeContractAsync({
          address: challengeAddress,
          abi: arenaChallengeAbi,
          functionName: "fundVaultUSDC",
          args: [amountUnits],
          chainId: xLayerMainnet.id
        });
      } else {
        await writeContractAsync({
          address: challengeAddress,
          abi: arenaChallengeAbi,
          functionName: "fundVault",
          value: amountUnits,
          chainId: xLayerMainnet.id
        });
      }
      setToast("Vault funding submitted.");
    } catch (error) {
      setToast(displayError(error, "Vault funding failed."));
    }
  }

  async function withdrawVault(amount: string, asset: ArenaAsset) {
    if (!challengeAddress || !address) {
      setToast("Connect the owner wallet first.");
      return;
    }
    try {
      await writeContractAsync({
        address: challengeAddress,
        abi: arenaChallengeAbi,
        functionName: "withdrawVault",
        args: [ARENA_ASSET_ID[asset], parseUnits(amount, ARENA_ASSET_DECIMALS[asset]), address],
        chainId: xLayerMainnet.id
      });
      setToast("Vault withdrawal submitted.");
    } catch (error) {
      setToast(displayError(error, "Vault withdrawal failed."));
    }
  }

  async function resolveSlipMatch(matchId: string, result: ArenaOutcome) {
    if (!challengeAddress) {
      setToast("Configure the vault address first.");
      return;
    }
    try {
      await writeContractAsync({
        address: challengeAddress,
        abi: arenaChallengeAbi,
        functionName: "resolveMatch",
        args: [keccak256(toBytes(matchId)), ARENA_OUTCOME_ID[result]],
        chainId: xLayerMainnet.id
      });
      setSlips((current) => current.map((slip) => (
        slip.matchId === matchId && slip.status === "LOCKED"
          ? { ...slip, actualResult: result, status: slip.predictedOutcome === result ? "WON" : "LOST" }
          : slip
      )));
      setToast("Match resolution submitted onchain.");
    } catch (error) {
      setToast(displayError(error, "Match resolution failed."));
    }
  }

  return (
    <main className="x-cup-bg min-h-[100dvh] overflow-x-clip text-white">
      {showLoader ? <KickoffLoader onSkip={() => setShowLoader(false)} /> : null}
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[92rem] flex-col px-4 pb-8 pt-4 sm:px-6 lg:px-8">
        <TopHeader address={address} isConnected={isConnected} isPending={isPending} balance={formattedBalance} onConnect={() => void connectWallet()} onDisconnect={() => disconnect()} />
        {toast ? <Toast message={toast} onClose={() => setToast("")} /> : null}
        {!isConnected ? (
          <WalletGate
            title="Connect to enter predictions"
            description="Profiles, prediction slips, GameFi, squads, agent actions, and vault controls are wallet-gated so every activity maps to a real user wallet."
            busy={isPending}
            onConnect={() => void connectWallet()}
          />
        ) : (
          <>
            <ArenaHero stats={stats} vaultBalance={vaultBalance} usdcVaultBalance={usdcVaultBalance} />
            <section className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
              <div className="grid content-start gap-4">
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
                <section className="grid content-start gap-3 md:grid-cols-2">
                  {loading ? <SkeletonCards /> : null}
                  {!loading && visibleMatches.map((match) => <MatchCard key={match.id} match={match} onEnter={() => setSelectedMatch(match)} />)}
                  {!loading && !visibleMatches.length ? (
                    <Card className="p-6 text-center md:col-span-2">
                      <p className="font-black text-white">No arena matches found.</p>
                      <p className="mt-2 text-sm text-muted">No live or upcoming {sport === "All" ? "arena" : sport.toLowerCase()} matches are available right now. Refresh or switch sports.</p>
                    </Card>
                  ) : null}
                </section>
              </div>
              <aside className="grid content-start gap-4">
                <MySlips slips={slips} onExit={(slip) => void exitSlip(slip)} onClaim={(slip) => void claimSlip(slip)} busy={isWriting} />
                {isVaultOwner ? <VaultAdminPanel busy={isWriting} onFund={(amount, asset) => void fundVault(amount, asset)} onWithdraw={(amount, asset) => void withdrawVault(amount, asset)} /> : null}
                {isVaultOwner || isVaultResolver ? <ResolverPanel slips={slips} busy={isWriting} onResolve={(matchId, result) => void resolveSlipMatch(matchId, result)} /> : null}
                <ArenaHeadlines news={news} />
                <ArenaLeaderboard slips={slips} stats={stats} sport={sport} range={range} setRange={setRange} />
              </aside>
            </section>
          </>
        )}
      </div>
      {selectedMatch ? (
        <ChallengeModal match={selectedMatch} isConnected={isConnected} busy={isWriting} onClose={() => setSelectedMatch(null)} onConnect={() => void connectWallet()} onLock={(input) => void lockChallenge(input)} />
      ) : null}
    </main>
  );
}

function ArenaHero({ stats, vaultBalance, usdcVaultBalance }: { stats: ArenaStats; vaultBalance?: bigint; usdcVaultBalance?: bigint }) {
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
        <div className="grid w-full max-w-[28rem] grid-cols-2 gap-2 text-sm sm:w-auto sm:grid-cols-3 lg:grid-cols-5">
          <Metric icon={Medal} label="XP" value={String(stats.xp)} />
          <Metric icon={Flame} label="Streak" value={String(stats.streak)} />
          <Metric icon={Activity} label="Total" value={String(stats.totalChallenges)} />
          <Metric icon={Coins} label="Vault" value={vaultBalance === undefined ? "Syncing" : `${Number(formatUnits(vaultBalance, 18)).toFixed(2)} OKB`} />
          <Metric icon={ShieldCheck} label="USDC" value={usdcVaultBalance === undefined ? "Syncing" : `${Number(formatUnits(usdcVaultBalance, 6)).toFixed(2)}`} />
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
  const [selectedSlip, setSelectedSlip] = useState<ArenaSlip | null>(null);
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
          <button key={slip.id} className="rounded-lg border border-white/10 bg-black/25 p-3 text-left transition hover:border-[#18e3bd]/35 hover:bg-[#18e3bd]/10" type="button" onClick={() => setSelectedSlip(slip)}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black text-white">{slip.matchName}</p>
                <p className="mt-1 text-xs text-muted">{formatAmount(slip.amountUnits, slip.asset)} {slip.asset} - {outcomeLabels[slip.predictedOutcome]}</p>
                <p className="mt-1 text-xs font-bold text-white/50">{slipStatusLabel(slip)}</p>
              </div>
              <Badge>{slip.status}</Badge>
            </div>
            {slip.actualResult ? <p className="mt-2 text-xs text-white/60">Actual: {outcomeLabels[slip.actualResult]}</p> : null}
            {slip.txHash ? <a className="mt-2 inline-flex text-xs font-bold text-[#18e3bd]" href={`${X_LAYER_EXPLORER_URL}/tx/${slip.txHash}`} target="_blank" rel="noreferrer">View tx</a> : null}
            <div className="mt-3 flex gap-2">
              {slip.status === "LOCKED" ? <Button size="sm" variant="secondary" disabled={busy} onClick={(event) => {
                event.stopPropagation();
                onExit(slip);
              }}>Withdraw to Wallet</Button> : null}
              {slip.status === "WON" && !slip.rewardClaimed ? <Button size="sm" disabled={busy} onClick={(event) => {
                event.stopPropagation();
                onClaim(slip);
              }}>Claim Reward</Button> : null}
              {slip.rewardClaimed ? <span className="inline-flex items-center gap-1 text-xs font-bold text-gain"><CheckCircle2 size={14} />Reward claimed</span> : null}
            </div>
          </button>
        ))}
        {!filtered.length ? <p className="rounded-lg border border-white/10 bg-black/25 p-4 text-sm text-muted">No {tab.toLowerCase()} challenge slips yet.</p> : null}
      </div>
      {selectedSlip ? <SlipDetailsModal slip={selectedSlip} busy={busy} onClose={() => setSelectedSlip(null)} onExit={onExit} onClaim={onClaim} /> : null}
    </Card>
  );
}

function slipStatusLabel(slip: ArenaSlip) {
  if (slip.status === "PENDING") return "Pending wallet confirmation";
  if (slip.status === "LOCKED") return "In progress / awaiting final result";
  if (slip.status === "WON") return "Won";
  if (slip.status === "LOST") return "Lost";
  return "Exited";
}

function SlipDetailsModal({
  slip,
  busy,
  onClose,
  onExit,
  onClaim
}: {
  slip: ArenaSlip;
  busy: boolean;
  onClose: () => void;
  onExit: (slip: ArenaSlip) => void;
  onClaim: (slip: ArenaSlip) => void;
}) {
  const rows = [
    ["Status", slipStatusLabel(slip)],
    ["Prediction", outcomeLabels[slip.predictedOutcome]],
    ["Actual result", slip.actualResult ? outcomeLabels[slip.actualResult] : "Not resolved yet"],
    ["Stake", `${formatAmount(slip.amountUnits, slip.asset)} ${slip.asset}`],
    ["Confidence", slip.confidence],
    ["Sport", slip.sport],
    ["League", slip.league ?? "Unknown"],
    ["Kickoff", slip.matchStartTime ? formatMatchTime(slip.matchStartTime) : "Unknown"],
    ["Match state", slip.matchStatus ?? "Unknown"],
    ["Chain slip ID", slip.chainSlipId ?? "Indexing"],
    ["Created", new Date(slip.createdAt).toLocaleString()]
  ];

  return (
    <div className="fixed inset-0 z-[95] grid place-items-end bg-black/70 p-3 backdrop-blur-md sm:place-items-center" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <Card className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#18e3bd]">Prediction Slip</p>
            <h2 className="mt-2 text-2xl font-black text-white">{slip.matchName}</h2>
            <p className="mt-1 text-sm text-muted">{slipStatusLabel(slip)}</p>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close slip details">
            <X size={18} aria-hidden="true" />
          </Button>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label} className="rounded-lg border border-white/10 bg-black/25 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/38">{label}</p>
              <p className="mt-1 break-words text-sm font-bold text-white">{value}</p>
            </div>
          ))}
        </div>
        {slip.reasoning ? (
          <div className="mt-3 rounded-lg border border-white/10 bg-black/25 p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/38">Reasoning</p>
            <p className="mt-1 text-sm leading-6 text-white/70">{slip.reasoning}</p>
          </div>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          {slip.txHash ? <a className="inline-flex min-h-10 items-center rounded-lg border border-white/10 bg-white/[0.06] px-4 text-sm font-black text-[#18e3bd] transition hover:bg-white/12" href={`${X_LAYER_EXPLORER_URL}/tx/${slip.txHash}`} target="_blank" rel="noreferrer">View transaction</a> : null}
          {slip.status === "LOCKED" ? <Button variant="secondary" disabled={busy} onClick={() => onExit(slip)}>Withdraw to Wallet</Button> : null}
          {slip.status === "WON" && !slip.rewardClaimed ? <Button disabled={busy} onClick={() => onClaim(slip)}>Claim Reward</Button> : null}
        </div>
      </Card>
    </div>
  );
}

function ArenaLeaderboard({ slips, stats, sport, range, setRange }: { slips: ArenaSlip[]; stats: ArenaStats; sport: "All" | ArenaSport; range: "Weekly" | "All-time"; setRange: (range: "Weekly" | "All-time") => void }) {
  const rows = useMemo(() => {
    const scoped = sport === "All" ? slips : slips.filter((slip) => slip.sport === sport);
    return stats.xp > 0 ? [{ name: "You", xp: stats.xp, streak: stats.streak, total: scoped.length }] : [];
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
        {!rows.length ? <p className="rounded-lg border border-white/10 bg-black/25 p-4 text-sm text-muted">Leaderboard opens after real users earn XP from resolved challenges.</p> : null}
      </div>
    </Card>
  );
}

function VaultAdminPanel({ busy, onFund, onWithdraw }: { busy: boolean; onFund: (amount: string, asset: ArenaAsset) => void; onWithdraw: (amount: string, asset: ArenaAsset) => void }) {
  const [fundAmount, setFundAmount] = useState("");
  const [fundAsset, setFundAsset] = useState<ArenaAsset>("OKB");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [asset, setAsset] = useState<ArenaAsset>("OKB");
  return (
    <Card className="p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Vault Owner</p>
      <p className="mt-2 text-sm leading-6 text-white/58">Fund rewards or withdraw vault liquidity with the owner wallet.</p>
      <div className="mt-4 grid gap-2">
        <select className="rounded-lg border border-white/10 bg-black/35 px-3 py-3 text-white outline-none" value={fundAsset} onChange={(event) => setFundAsset(event.target.value as ArenaAsset)}>
          <option className="bg-surface" value="OKB">OKB</option>
          <option className="bg-surface" value="USDC">USDC</option>
        </select>
        <input className="rounded-lg border border-white/10 bg-black/35 px-3 py-3 text-white outline-none" value={fundAmount} onChange={(event) => setFundAmount(event.target.value)} placeholder={`${fundAsset} amount to fund`} />
        <Button disabled={busy || !Number(fundAmount)} onClick={() => onFund(fundAmount, fundAsset)}>Fund Vault</Button>
      </div>
      <div className="mt-4 grid gap-2">
        <select className="rounded-lg border border-white/10 bg-black/35 px-3 py-3 text-white outline-none" value={asset} onChange={(event) => setAsset(event.target.value as ArenaAsset)}>
          <option className="bg-surface" value="OKB">OKB</option>
          <option className="bg-surface" value="USDC">USDC</option>
        </select>
        <input className="rounded-lg border border-white/10 bg-black/35 px-3 py-3 text-white outline-none" value={withdrawAmount} onChange={(event) => setWithdrawAmount(event.target.value)} placeholder={`${asset} amount to withdraw`} />
        <Button variant="secondary" disabled={busy || !Number(withdrawAmount)} onClick={() => onWithdraw(withdrawAmount, asset)}>Withdraw to Owner Wallet</Button>
      </div>
    </Card>
  );
}

function ResolverPanel({ slips, busy, onResolve }: { slips: ArenaSlip[]; busy: boolean; onResolve: (matchId: string, result: ArenaOutcome) => void }) {
  const pendingMatches = Array.from(
    new Map(
      slips
        .filter((slip) => slip.status === "LOCKED")
        .map((slip) => [slip.matchId, slip])
    ).values()
  );
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [result, setResult] = useState<ArenaOutcome>("HOME");

  useEffect(() => {
    if (!selectedMatchId && pendingMatches[0]) {
      setSelectedMatchId(pendingMatches[0].matchId);
    }
  }, [pendingMatches, selectedMatchId]);

  return (
    <Card className="p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Match Resolver</p>
      <p className="mt-2 text-sm leading-6 text-white/58">Resolve locked challenge matches onchain when the final result is known.</p>
      <div className="mt-4 grid gap-2">
        <select className="rounded-lg border border-white/10 bg-black/35 px-3 py-3 text-white outline-none" value={selectedMatchId} onChange={(event) => setSelectedMatchId(event.target.value)}>
          {pendingMatches.map((slip) => <option key={slip.matchId} value={slip.matchId}>{slip.matchName}</option>)}
        </select>
        <select className="rounded-lg border border-white/10 bg-black/35 px-3 py-3 text-white outline-none" value={result} onChange={(event) => setResult(event.target.value as ArenaOutcome)}>
          <option className="bg-surface" value="HOME">Home wins</option>
          <option className="bg-surface" value="DRAW">Draw</option>
          <option className="bg-surface" value="AWAY">Away wins</option>
        </select>
        <Button disabled={busy || !selectedMatchId} onClick={() => onResolve(selectedMatchId, result)}>Resolve Match Onchain</Button>
      </div>
      {!pendingMatches.length ? <p className="mt-3 rounded-lg border border-white/10 bg-black/25 p-3 text-sm text-muted">No locked matches waiting for manual resolution.</p> : null}
    </Card>
  );
}

function ArenaHeadlines({ news }: { news: SportsNewsItem[] }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Live Headlines</p>
          <h2 className="mt-1 text-lg font-black text-white">World Cup pulse</h2>
        </div>
        <Newspaper size={18} className="text-[#18e3bd]" aria-hidden="true" />
      </div>
      <div className="mt-4 grid gap-2">
        {news.slice(0, 4).map((item) => (
          <Link key={item.id} className="block rounded-lg border border-white/10 bg-black/25 p-3 transition hover:bg-white/[0.08]" href={`/news/${encodeURIComponent(item.id)}`}>
            <p className="text-sm font-black text-white">{item.title}</p>
            <p className="mt-1 text-xs text-white/55">{item.source}</p>
          </Link>
        ))}
        {!news.length ? <p className="rounded-lg border border-white/10 bg-black/25 p-4 text-sm text-muted">No live headlines available right now.</p> : null}
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
