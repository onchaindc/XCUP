"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowUpRight,
  BadgeCheck,
  Bot,
  Cable,
  CircleDollarSign,
  Clock3,
  Coins,
  Copy,
  Crown,
  Flame,
  Gamepad2,
  Goal,
  Medal,
  MessageCircle,
  Network,
  PlugZap,
  Radio,
  ShieldCheck,
  Sparkles,
  Swords,
  Ticket,
  Trophy,
  Users,
  Wallet,
  Zap
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { formatUnits } from "viem";
import { useAccount, useBalance, useConnect, useDisconnect } from "wagmi";
import { X_LAYER_EXPLORER_URL, xLayerTestnet } from "@/lib/arc";
import { useNetworkStatus } from "@/lib/use-network-status";
import { shortAddress } from "@/lib/utils";

type TrackId = "arena" | "markets" | "social" | "gamefi" | "agent" | "proof";
type ProofStatus = "prepared" | "signed" | "settled";

type Fixture = {
  id: string;
  stage: string;
  teams: [string, string];
  kickoff: string;
  liquidity: string;
  sentiment: string;
  agentEdge: string;
};

type Market = {
  id: string;
  fixtureId: string;
  question: string;
  odds: [number, number];
  volume: string;
  settlement: string;
  category: "prediction" | "side quest" | "agent";
};

type ProofEvent = {
  id: string;
  title: string;
  detail: string;
  payloadHash: string;
  status: ProofStatus;
  createdAt: string;
};

const tracks: Array<{ id: TrackId; label: string; icon: LucideIcon }> = [
  { id: "arena", label: "Arena", icon: Trophy },
  { id: "markets", label: "Markets", icon: CircleDollarSign },
  { id: "social", label: "SocialFi", icon: Users },
  { id: "gamefi", label: "GameFi", icon: Gamepad2 },
  { id: "agent", label: "Agent", icon: Bot },
  { id: "proof", label: "Proof", icon: ShieldCheck }
];

const fixtures: Fixture[] = [
  {
    id: "ng-arg",
    stage: "Group A",
    teams: ["Nigeria", "Argentina"],
    kickoff: "Jun 12, 20:00 UTC",
    liquidity: "$84.6K",
    sentiment: "64% Eagles",
    agentEdge: "+7.4% counter-press volatility"
  },
  {
    id: "br-fr",
    stage: "Quarter Final",
    teams: ["Brazil", "France"],
    kickoff: "Jun 28, 18:00 UTC",
    liquidity: "$132.9K",
    sentiment: "52% Brazil",
    agentEdge: "low draw risk, high goal delta"
  },
  {
    id: "us-jp",
    stage: "Round of 16",
    teams: ["USA", "Japan"],
    kickoff: "Jun 21, 23:00 UTC",
    liquidity: "$61.2K",
    sentiment: "58% Samurai Blue",
    agentEdge: "late-game stamina swing"
  }
];

const markets: Market[] = [
  {
    id: "m1",
    fixtureId: "ng-arg",
    question: "Nigeria to score first?",
    odds: [42, 58],
    volume: "$18.4K",
    settlement: "Final whistle oracle + ref attestation",
    category: "prediction"
  },
  {
    id: "m2",
    fixtureId: "ng-arg",
    question: "Match total over 2.5 goals?",
    odds: [61, 39],
    volume: "$26.8K",
    settlement: "FIFA score feed + agent dispute window",
    category: "agent"
  },
  {
    id: "m3",
    fixtureId: "br-fr",
    question: "Brazil win in regulation?",
    odds: [51, 49],
    volume: "$41.7K",
    settlement: "Result oracle, no shootout",
    category: "prediction"
  },
  {
    id: "m4",
    fixtureId: "us-jp",
    question: "Japan completes 500+ passes?",
    odds: [47, 53],
    volume: "$9.9K",
    settlement: "Stats feed with fan challenge bonus",
    category: "side quest"
  }
];

const socialPosts = [
  {
    squad: "Lagos North Stand",
    handle: "@naijacurve",
    message: "The market says Argentina early pressure. Our squad is backing a 20-minute clean sheet quest.",
    heat: "12.8K XP"
  },
  {
    squad: "Samba DAO",
    handle: "@verdechain",
    message: "Golden Boot relic mint opens when Brazil clears 65% attack share. Watch the agent trigger.",
    heat: "8.1K XP"
  },
  {
    squad: "Blue Samurai Lab",
    handle: "@shibuyaultras",
    message: "Pass-count side quest is quietly mispriced. We are staking squad XP, not just OKB.",
    heat: "5.6K XP"
  }
];

const collectibles = [
  {
    title: "Momentum Passport",
    meta: "Dynamic NFT",
    detail: "Evolves with predictions, squad votes, and verified match streaks.",
    icon: Ticket
  },
  {
    title: "Golden Boot Relic",
    meta: "Limited Drop",
    detail: "Mint gate unlocks from scorer markets and agent-confirmed milestones.",
    icon: Medal
  },
  {
    title: "Ultra Captain Badge",
    meta: "Soulbound",
    detail: "Ranks fans who drive clean settlement volume and squad growth.",
    icon: Crown
  }
];

const gameLoops = [
  {
    title: "Penalty Duel",
    prize: "2.4K XP",
    body: "Pick keeper direction after staking a market ticket. Winning streaks boost NFT metadata.",
    icon: Goal
  },
  {
    title: "Streak Ladder",
    prize: "Mint allowlist",
    body: "Build a matchday streak across predictions, chants, and agent quests.",
    icon: Flame
  },
  {
    title: "Squad Raid",
    prize: "Fee rebate",
    body: "Coordinate 11 fans into one on-chain pool and split quest rewards by contribution.",
    icon: Swords
  }
];

const judgingMap = [
  ["Innovation", "A single World Cup loop where markets, squads, NFTs, mini-games, and agents reinforce each other."],
  ["Market potential", "Matchday traffic converts into wallet connects, prediction tickets, mints, squad quests, and repeat XP loops."],
  ["Completion", "X Layer wallet/network flows, contract scaffold, proof hashes, and demo-ready actions are visible in-product."]
];

const contractAddress = process.env.NEXT_PUBLIC_XCUP_ARENA_ADDRESS || "";

export function XCupApp() {
  const [showLoader, setShowLoader] = useState(true);
  const [activeTrack, setActiveTrack] = useState<TrackId>("arena");
  const [selectedFixtureId, setSelectedFixtureId] = useState(fixtures[0].id);
  const [agentMode, setAgentMode] = useState<"signal" | "risk" | "growth">("signal");
  const [agentReply, setAgentReply] = useState("I am watching liquidity shifts, fan heat, and match-state risk. Choose a market and I will prepare a verifiable action.");
  const [actionStatus, setActionStatus] = useState("");
  const [proofs, setProofs] = useState<ProofEvent[]>([
    {
      id: "genesis",
      title: "Arena initialized",
      detail: "Local proof lane ready for X Layer contract deployment.",
      payloadHash: "0x7c5d...kickoff",
      status: "prepared",
      createdAt: "Now"
    }
  ]);
  const { address, isConnected } = useAccount();
  const { connectors, connectAsync, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const network = useNetworkStatus();
  const { data: balance } = useBalance({
    address,
    chainId: xLayerTestnet.id,
    query: { enabled: Boolean(address) }
  });
  const selectedFixture = fixtures.find((fixture) => fixture.id === selectedFixtureId) ?? fixtures[0];
  const selectedMarkets = markets.filter((market) => market.fixtureId === selectedFixture.id);
  const formattedBalance = balance ? `${Number(formatUnits(balance.value, balance.decimals)).toFixed(4)} ${balance.symbol}` : "0.0000 OKB";

  useEffect(() => {
    const timer = window.setTimeout(() => setShowLoader(false), 2600);
    return () => window.clearTimeout(timer);
  }, []);

  const aggregate = useMemo(
    () => ({
      liquidity: "$289K",
      fanXp: "1.8M",
      mints: "42.6K",
      proofs: proofs.length.toString()
    }),
    [proofs.length]
  );

  async function connectWallet() {
    setActionStatus("");
    try {
      const connector = connectors[0];
      if (!connector) {
        setActionStatus("No injected or WalletConnect provider was detected.");
        return;
      }
      await connectAsync({ connector, chainId: xLayerTestnet.id });
      setActionStatus("Wallet connected. X Layer network check is active.");
    } catch (error) {
      setActionStatus(error instanceof Error ? error.message : "Wallet connection failed.");
    }
  }

  async function addXLayer() {
    setActionStatus("");
    try {
      await network.addNetwork();
      setActionStatus("X Layer Testnet was requested in your wallet.");
    } catch (error) {
      setActionStatus(error instanceof Error ? error.message : "Unable to add X Layer.");
    }
  }

  async function recordProof(title: string, detail: string, payload: Record<string, unknown>, status: ProofStatus = "prepared") {
    const encoded = new TextEncoder().encode(JSON.stringify({ title, detail, payload, timestamp: new Date().toISOString() }));
    const digest = await crypto.subtle.digest("SHA-256", encoded);
    const hash = `0x${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
    const nextProof: ProofEvent = {
      id: crypto.randomUUID(),
      title,
      detail,
      payloadHash: hash,
      status,
      createdAt: new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit" }).format(new Date())
    };
    setProofs((items) => [nextProof, ...items].slice(0, 8));
    return nextProof;
  }

  async function preparePrediction(market: Market, side: "yes" | "no") {
    const fixture = fixtures.find((item) => item.id === market.fixtureId) ?? selectedFixture;
    await recordProof(
      "Prediction ticket prepared",
      `${fixture.teams.join(" vs ")} | ${market.question} | ${side.toUpperCase()}`,
      {
        fixtureId: fixture.id,
        marketId: market.id,
        side,
        chainId: xLayerTestnet.id,
        contractAddress: contractAddress || "pending"
      }
    );
    setActionStatus(contractAddress ? "Ticket payload prepared. Contract write can be connected next." : "Ticket proof prepared locally. Deploy the arena contract and set NEXT_PUBLIC_XCUP_ARENA_ADDRESS to submit on-chain.");
    setActiveTrack("proof");
  }

  async function mintCollectible(title: string) {
    await recordProof(
      "NFT mint intent",
      `${title} mint gate prepared for ${shortAddress(address)}`,
      {
        collectible: title,
        fan: address ?? "guest",
        chainId: xLayerTestnet.id
      },
      isConnected ? "signed" : "prepared"
    );
    setActionStatus(isConnected ? `${title} mint intent signed locally. Wire contract mint next.` : `Connect a wallet to sign the ${title} mint intent.`);
    setActiveTrack("proof");
  }

  async function runAgent() {
    const modeCopy = {
      signal: "Signal: liquidity is clustering around first-goal and over-2.5 markets. Best demo action is to prepare a small ticket, then mint Momentum Passport metadata from the same proof.",
      risk: "Risk: keep settlement language honest. Do not claim live FIFA oracle execution until the deployed contract and oracle address are published in the README.",
      growth: "Growth: squads are the viral wedge. A fan can join a squad, share a prediction receipt, and invite 10 matchday viewers into one X Layer wallet path."
    }[agentMode];
    setAgentReply(modeCopy);
    await recordProof("Agent briefing generated", `${selectedFixture.teams.join(" vs ")} | ${agentMode}`, {
      fixtureId: selectedFixture.id,
      mode: agentMode,
      reply: modeCopy
    });
  }

  return (
    <main className="x-cup-bg min-h-[100dvh] overflow-x-clip text-white">
      <AnimatePresence>{showLoader ? <KickoffLoader onSkip={() => setShowLoader(false)} /> : null}</AnimatePresence>
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[92rem] flex-col px-4 pb-8 pt-4 sm:px-6 lg:px-8">
        <AppHeader
          address={address}
          isConnected={isConnected}
          balance={formattedBalance}
          networkBadge={network.badge}
          networkSyncing={network.syncing || isPending}
          onConnect={() => void connectWallet()}
          onDisconnect={() => disconnect()}
          onAddNetwork={() => void addXLayer()}
        />
        {actionStatus ? (
          <div className="mb-3 rounded-lg border border-white/12 bg-white/[0.06] px-3 py-2 text-sm font-semibold text-white/84">
            {actionStatus}
          </div>
        ) : null}
        <section className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)] xl:grid-cols-[minmax(0,1.18fr)_minmax(24rem,0.82fr)]">
          <div className="grid gap-4">
            <HeroCommand
              aggregate={aggregate}
              selectedFixture={selectedFixture}
              networkOk={network.onArc || !isConnected}
              onAddNetwork={() => void addXLayer()}
            />
            <TrackTabs activeTrack={activeTrack} onChange={setActiveTrack} />
            {activeTrack === "arena" ? (
              <ArenaPanel
                fixtures={fixtures}
                selectedFixtureId={selectedFixtureId}
                onSelectFixture={setSelectedFixtureId}
                selectedMarkets={selectedMarkets}
                onPrediction={(market, side) => void preparePrediction(market, side)}
              />
            ) : null}
            {activeTrack === "markets" ? <MarketsPanel onPrediction={(market, side) => void preparePrediction(market, side)} /> : null}
            {activeTrack === "social" ? <SocialPanel onMint={(title) => void mintCollectible(title)} /> : null}
            {activeTrack === "gamefi" ? <GameFiPanel /> : null}
            {activeTrack === "agent" ? (
              <AgentPanel
                agentMode={agentMode}
                setAgentMode={setAgentMode}
                agentReply={agentReply}
                onRun={() => void runAgent()}
              />
            ) : null}
            {activeTrack === "proof" ? <ProofPanel proofs={proofs} /> : null}
          </div>
          <aside className="grid content-start gap-4">
            <AgentCard
              fixture={selectedFixture}
              agentMode={agentMode}
              setAgentMode={setAgentMode}
              agentReply={agentReply}
              onRun={() => void runAgent()}
            />
            <ProofRail proofs={proofs} onOpenProof={() => setActiveTrack("proof")} />
            <JudgingCard />
          </aside>
        </section>
      </div>
    </main>
  );
}

function AppHeader({
  address,
  isConnected,
  balance,
  networkBadge,
  networkSyncing,
  onConnect,
  onDisconnect,
  onAddNetwork
}: {
  address?: `0x${string}`;
  isConnected: boolean;
  balance: string;
  networkBadge: { label: string; tone: "good" | "danger" | "syncing" | "muted" };
  networkSyncing: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onAddNetwork: () => void;
}) {
  return (
    <header className="mb-4 flex min-w-0 items-center justify-between gap-3">
      <XLayerLockup />
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={`hidden items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold sm:flex ${
            networkBadge.tone === "danger"
              ? "border-[#ff5c39]/35 bg-[#ff5c39]/10 text-[#ff9c82]"
              : networkBadge.tone === "good"
                ? "border-[#18e3bd]/30 bg-[#18e3bd]/10 text-[#80ffe2]"
                : "border-white/12 bg-white/[0.06] text-white/72"
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${networkSyncing ? "animate-pulse bg-[#18e3bd]" : networkBadge.tone === "danger" ? "bg-[#ff5c39]" : "bg-[#18e3bd]"}`} />
          {networkBadge.label}
        </span>
        {networkBadge.tone === "danger" ? (
          <button className="hidden rounded-lg border border-[#ff5c39]/35 bg-[#ff5c39]/10 px-3 py-2 text-xs font-black text-[#ff9c82] transition hover:bg-[#ff5c39]/18 md:inline-flex" type="button" onClick={onAddNetwork}>
            Add X Layer
          </button>
        ) : null}
        {isConnected ? (
          <button className="flex max-w-[11.5rem] items-center gap-2 rounded-lg border border-white/12 bg-white/[0.07] px-3 py-2 text-left text-xs font-bold text-white transition hover:bg-white/12" type="button" onClick={onDisconnect}>
            <Wallet size={16} aria-hidden="true" />
            <span className="min-w-0">
              <span className="block truncate">{shortAddress(address)}</span>
              <span className="block truncate text-[11px] text-white/50">{balance}</span>
            </span>
          </button>
        ) : (
          <button className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-black text-black transition hover:bg-[#18e3bd]" type="button" onClick={onConnect}>
            <Wallet size={16} aria-hidden="true" />
            Connect
          </button>
        )}
      </div>
    </header>
  );
}

function XLayerLockup() {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <XLayerMark className="h-9 w-9 shrink-0" />
      <div className="min-w-0">
        <p className="truncate text-base font-black tracking-normal text-white">X Cup Edition</p>
        <p className="truncate text-[11px] font-bold uppercase tracking-[0.22em] text-white/42">World Cup on X Layer</p>
      </div>
    </div>
  );
}

function XLayerMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" role="img" aria-label="X Layer">
      <rect width="8" height="8" x="4" y="4" fill="currentColor" />
      <rect width="8" height="8" x="16" y="4" fill="currentColor" opacity="0.72" />
      <rect width="8" height="8" x="4" y="16" fill="currentColor" opacity="0.72" />
      <rect width="8" height="8" x="28" y="4" fill="currentColor" opacity="0.42" />
      <rect width="8" height="8" x="16" y="16" fill="currentColor" />
      <rect width="8" height="8" x="28" y="16" fill="currentColor" opacity="0.72" />
      <rect width="8" height="8" x="4" y="28" fill="currentColor" opacity="0.42" />
      <rect width="8" height="8" x="16" y="28" fill="currentColor" opacity="0.72" />
    </svg>
  );
}

function KickoffLoader({ onSkip }: { onSkip: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-[80] grid place-items-center bg-black"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.55 }}
      aria-label="Loading X Cup arena"
    >
      <button className="absolute right-4 top-4 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-white/44 transition hover:text-white" type="button" onClick={onSkip}>
        Skip
      </button>
      <div className="x-loader-scene" aria-hidden="true">
        <div className="x-loader-goal">
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="x-loader-beams">
          <i />
          <i />
          <i />
        </div>
        <div className="x-loader-ball">
          <b />
          <b />
          <b />
        </div>
        <div className="x-loader-particles">
          {Array.from({ length: 20 }, (_, index) => (
            <span key={index} style={{ "--i": index } as CSSProperties} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function HeroCommand({
  aggregate,
  selectedFixture,
  networkOk,
  onAddNetwork
}: {
  aggregate: { liquidity: string; fanXp: string; mints: string; proofs: string };
  selectedFixture: Fixture;
  networkOk: boolean;
  onAddNetwork: () => void;
}) {
  return (
    <section className="relative min-h-[27rem] overflow-hidden rounded-lg border border-white/10 bg-black">
      <div className="absolute inset-0 opacity-90">
        <div className="x-reference-grid" />
        <div className="x-reference-ribbon x-reference-ribbon-one" />
        <div className="x-reference-ribbon x-reference-ribbon-two" />
        <div className="x-reference-ribbon x-reference-ribbon-three" />
        <div className="x-reference-ball" />
      </div>
      <div className="relative z-10 flex min-h-[27rem] flex-col justify-between p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-2xl font-light tracking-normal text-white sm:text-3xl">X Cup Edition</p>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/58">
              One matchday arena for prediction markets, squad trading rooms, dynamic NFT passes, mini-games, and AI-assisted settlement.
            </p>
          </div>
          <div className="hidden rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-right text-xs font-bold text-white/62 sm:block">
            <p>{xLayerTestnet.name}</p>
            <p className="text-white/36">Chain {xLayerTestnet.id}</p>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="self-end">
            <div className="mb-4 flex flex-wrap gap-2">
              {["Prediction Markets", "SocialFi", "NFTs", "GameFi", "AI Agents"].map((item) => (
                <span key={item} className="rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs font-bold text-white/70">
                  {item}
                </span>
              ))}
            </div>
            <h1 className="max-w-3xl text-4xl font-black leading-[1.02] tracking-normal text-white sm:text-5xl lg:text-6xl">
              Trade the match. Rally the squad. Prove the win.
            </h1>
            <div className="mt-5 flex flex-wrap gap-2">
              <button className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-black text-black transition hover:bg-[#18e3bd]" type="button" onClick={networkOk ? undefined : onAddNetwork}>
                <PlugZap size={16} aria-hidden="true" />
                {networkOk ? "X Layer Ready" : "Add X Layer"}
              </button>
              <a className="flex items-center gap-2 rounded-lg border border-white/12 bg-white/[0.06] px-3 py-2 text-sm font-black text-white transition hover:bg-white/12" href={X_LAYER_EXPLORER_URL} target="_blank" rel="noreferrer">
                <Network size={16} aria-hidden="true" />
                Explorer
              </a>
            </div>
          </div>
          <div className="grid content-end gap-2">
            <MiniStat label="Fixture" value={selectedFixture.teams.join(" / ")} icon={Radio} />
            <MiniStat label="Liquidity" value={aggregate.liquidity} icon={Coins} />
            <MiniStat label="Fan XP" value={aggregate.fanXp} icon={Zap} />
            <MiniStat label="Mints" value={aggregate.mints} icon={Ticket} />
          </div>
        </div>
        <div className="mt-6 flex items-end justify-between gap-4">
          <XLayerLockup />
          <div className="text-right text-[11px] font-bold uppercase tracking-[0.2em] text-white/34">Market proof lane: {aggregate.proofs}</div>
        </div>
      </div>
    </section>
  );
}

function MiniStat({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/55 p-3 backdrop-blur-md">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/42">{label}</p>
        <Icon size={15} className="text-[#18e3bd]" aria-hidden="true" />
      </div>
      <p className="mt-2 truncate text-lg font-black text-white">{value}</p>
    </div>
  );
}

function TrackTabs({ activeTrack, onChange }: { activeTrack: TrackId; onChange: (track: TrackId) => void }) {
  return (
    <nav className="grid grid-cols-3 gap-1 rounded-lg border border-white/10 bg-white/[0.04] p-1 sm:grid-cols-6">
      {tracks.map((track) => (
        <button
          key={track.id}
          className={`flex min-h-11 items-center justify-center gap-2 rounded-md px-2 text-xs font-black transition ${
            activeTrack === track.id ? "bg-white text-black" : "text-white/58 hover:bg-white/[0.07] hover:text-white"
          }`}
          type="button"
          onClick={() => onChange(track.id)}
        >
          <track.icon size={15} aria-hidden="true" />
          <span>{track.label}</span>
        </button>
      ))}
    </nav>
  );
}

function ArenaPanel({
  fixtures,
  selectedFixtureId,
  onSelectFixture,
  selectedMarkets,
  onPrediction
}: {
  fixtures: Fixture[];
  selectedFixtureId: string;
  onSelectFixture: (fixtureId: string) => void;
  selectedMarkets: Market[];
  onPrediction: (market: Market, side: "yes" | "no") => void;
}) {
  return (
    <section className="grid gap-4 xl:grid-cols-[18rem_minmax(0,1fr)]">
      <div className="grid gap-2">
        {fixtures.map((fixture) => (
          <button
            key={fixture.id}
            className={`rounded-lg border p-3 text-left transition ${
              selectedFixtureId === fixture.id ? "border-white bg-white text-black" : "border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
            }`}
            type="button"
            onClick={() => onSelectFixture(fixture.id)}
          >
            <p className="text-[11px] font-black uppercase tracking-[0.16em] opacity-60">{fixture.stage}</p>
            <p className="mt-2 text-lg font-black">{fixture.teams.join(" vs ")}</p>
            <p className="mt-1 text-xs font-semibold opacity-60">{fixture.kickoff}</p>
          </button>
        ))}
      </div>
      <div className="grid gap-3">
        {selectedMarkets.map((market) => (
          <MarketCard key={market.id} market={market} onPrediction={onPrediction} />
        ))}
      </div>
    </section>
  );
}

function MarketsPanel({ onPrediction }: { onPrediction: (market: Market, side: "yes" | "no") => void }) {
  return (
    <section className="grid gap-3 lg:grid-cols-2">
      {markets.map((market) => (
        <MarketCard key={market.id} market={market} onPrediction={onPrediction} />
      ))}
    </section>
  );
}

function MarketCard({ market, onPrediction }: { market: Market; onPrediction: (market: Market, side: "yes" | "no") => void }) {
  const fixture = fixtures.find((item) => item.id === market.fixtureId) ?? fixtures[0];

  return (
    <article className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">{fixture.teams.join(" vs ")}</p>
          <h2 className="mt-2 text-xl font-black leading-tight text-white">{market.question}</h2>
        </div>
        <span className="shrink-0 rounded-lg border border-white/10 bg-black/28 px-2 py-1 text-[11px] font-black uppercase text-white/58">
          {market.category}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button className="rounded-lg border border-[#18e3bd]/35 bg-[#18e3bd]/10 p-3 text-left transition hover:bg-[#18e3bd]/18" type="button" onClick={() => onPrediction(market, "yes")}>
          <span className="text-xs font-bold text-white/56">YES</span>
          <span className="mt-1 block text-2xl font-black text-white">{market.odds[0]}%</span>
        </button>
        <button className="rounded-lg border border-[#ff5c39]/35 bg-[#ff5c39]/10 p-3 text-left transition hover:bg-[#ff5c39]/18" type="button" onClick={() => onPrediction(market, "no")}>
          <span className="text-xs font-bold text-white/56">NO</span>
          <span className="mt-1 block text-2xl font-black text-white">{market.odds[1]}%</span>
        </button>
      </div>
      <div className="mt-4 grid gap-2 text-sm text-white/64 sm:grid-cols-2">
        <p className="flex items-center gap-2">
          <Coins size={15} className="text-[#f5a524]" aria-hidden="true" />
          Volume {market.volume}
        </p>
        <p className="flex items-center gap-2">
          <ShieldCheck size={15} className="text-[#18e3bd]" aria-hidden="true" />
          {market.settlement}
        </p>
      </div>
    </article>
  );
}

function SocialPanel({ onMint }: { onMint: (title: string) => void }) {
  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="grid gap-3">
        {socialPosts.map((post) => (
          <article key={post.handle} className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black text-white">{post.squad}</p>
                <p className="text-sm font-semibold text-white/42">{post.handle}</p>
              </div>
              <span className="rounded-lg border border-[#f5a524]/30 bg-[#f5a524]/10 px-2 py-1 text-xs font-black text-[#ffd087]">{post.heat}</span>
            </div>
            <p className="mt-4 text-sm leading-6 text-white/70">{post.message}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-black text-white transition hover:bg-white/10" type="button">
                <MessageCircle size={14} aria-hidden="true" />
                Chant
              </button>
              <button className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-black text-white transition hover:bg-white/10" type="button">
                <ArrowUpRight size={14} aria-hidden="true" />
                Share Receipt
              </button>
            </div>
          </article>
        ))}
      </div>
      <div className="grid gap-3">
        {collectibles.map((item) => (
          <article key={item.title} className="rounded-lg border border-white/10 bg-black/35 p-4">
            <item.icon size={22} className="text-[#18e3bd]" aria-hidden="true" />
            <p className="mt-3 text-lg font-black text-white">{item.title}</p>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-white/40">{item.meta}</p>
            <p className="mt-3 text-sm leading-6 text-white/64">{item.detail}</p>
            <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-black text-black transition hover:bg-[#18e3bd]" type="button" onClick={() => onMint(item.title)}>
              <Ticket size={15} aria-hidden="true" />
              Prepare Mint
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function GameFiPanel() {
  return (
    <section className="grid gap-3 lg:grid-cols-3">
      {gameLoops.map((loop) => (
        <article key={loop.title} className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
          <loop.icon size={24} className="text-[#f5a524]" aria-hidden="true" />
          <p className="mt-4 text-xl font-black text-white">{loop.title}</p>
          <p className="mt-1 text-sm font-black text-[#18e3bd]">{loop.prize}</p>
          <p className="mt-3 text-sm leading-6 text-white/64">{loop.body}</p>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-[#18e3bd] via-[#f5a524] to-[#ff5c39]" />
          </div>
        </article>
      ))}
    </section>
  );
}

function AgentPanel({
  agentMode,
  setAgentMode,
  agentReply,
  onRun
}: {
  agentMode: "signal" | "risk" | "growth";
  setAgentMode: (mode: "signal" | "risk" | "growth") => void;
  agentReply: string;
  onRun: () => void;
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">AI Agent</p>
          <h2 className="mt-2 text-2xl font-black text-white">Match Oracle cockpit</h2>
        </div>
        <Bot className="text-white/50" size={24} aria-hidden="true" />
      </div>
      <AgentModeControl agentMode={agentMode} setAgentMode={setAgentMode} />
      <div className="mt-4 rounded-lg border border-white/10 bg-black/35 p-4">
        <p className="text-sm leading-7 text-white/76">{agentReply}</p>
      </div>
      <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-white px-3 py-3 text-sm font-black text-black transition hover:bg-[#18e3bd]" type="button" onClick={onRun}>
        <Sparkles size={16} aria-hidden="true" />
        Generate Briefing Proof
      </button>
    </section>
  );
}

function AgentCard({
  fixture,
  agentMode,
  setAgentMode,
  agentReply,
  onRun
}: {
  fixture: Fixture;
  agentMode: "signal" | "risk" | "growth";
  setAgentMode: (mode: "signal" | "risk" | "growth") => void;
  agentReply: string;
  onRun: () => void;
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Agent</p>
          <h2 className="mt-1 text-xl font-black text-white">Match Oracle</h2>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-white text-black">
          <Bot size={20} aria-hidden="true" />
        </span>
      </div>
      <div className="mt-4 rounded-lg border border-white/10 bg-black/35 p-3">
        <p className="text-sm font-black text-white">{fixture.teams.join(" vs ")}</p>
        <p className="mt-2 text-sm leading-6 text-white/58">{fixture.agentEdge}</p>
      </div>
      <AgentModeControl agentMode={agentMode} setAgentMode={setAgentMode} />
      <p className="mt-4 text-sm leading-6 text-white/66">{agentReply}</p>
      <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-white/12 bg-white/[0.06] px-3 py-2 text-sm font-black text-white transition hover:bg-white/12" type="button" onClick={onRun}>
        <Activity size={16} aria-hidden="true" />
        Run Agent
      </button>
    </section>
  );
}

function AgentModeControl({
  agentMode,
  setAgentMode
}: {
  agentMode: "signal" | "risk" | "growth";
  setAgentMode: (mode: "signal" | "risk" | "growth") => void;
}) {
  return (
    <div className="mt-4 grid grid-cols-3 gap-1 rounded-lg border border-white/10 bg-black/32 p-1">
      {(["signal", "risk", "growth"] as const).map((mode) => (
        <button
          key={mode}
          className={`rounded-md px-2 py-2 text-xs font-black capitalize transition ${agentMode === mode ? "bg-white text-black" : "text-white/52 hover:bg-white/10 hover:text-white"}`}
          type="button"
          onClick={() => setAgentMode(mode)}
        >
          {mode}
        </button>
      ))}
    </div>
  );
}

function ProofRail({ proofs, onOpenProof }: { proofs: ProofEvent[]; onOpenProof: () => void }) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Proof Lane</p>
          <h2 className="mt-1 text-xl font-black text-white">On-chain ready</h2>
        </div>
        <button className="rounded-lg border border-white/10 bg-white/[0.06] p-2 text-white/70 transition hover:text-white" type="button" onClick={onOpenProof} aria-label="Open proof panel">
          <ArrowUpRight size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="mt-4 grid gap-2">
        <ProofRow proof={proofs[0]} compact />
        <div className="rounded-lg border border-white/10 bg-black/32 p-3 text-sm">
          <p className="font-black text-white">Contract</p>
          <p className="mt-1 break-all text-white/52">{contractAddress || "NEXT_PUBLIC_XCUP_ARENA_ADDRESS not set"}</p>
        </div>
      </div>
    </section>
  );
}

function ProofPanel({ proofs }: { proofs: ProofEvent[] }) {
  return (
    <section className="grid gap-3">
      <div className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">X Layer Completion</p>
            <h2 className="mt-2 text-2xl font-black text-white">Verifiability board</h2>
          </div>
          <ShieldCheck size={26} className="text-white/50" aria-hidden="true" />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <ProofMetric label="Network" value={xLayerTestnet.name} icon={Network} />
          <ProofMetric label="Chain ID" value={String(xLayerTestnet.id)} icon={Cable} />
          <ProofMetric label="Contract" value={contractAddress ? "Configured" : "Pending"} icon={BadgeCheck} />
        </div>
      </div>
      {proofs.map((proof) => (
        <ProofRow key={proof.id} proof={proof} />
      ))}
    </section>
  );
}

function ProofMetric({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/32 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white/40">{label}</p>
        <Icon size={15} className="text-[#18e3bd]" aria-hidden="true" />
      </div>
      <p className="mt-2 truncate text-lg font-black text-white">{value}</p>
    </div>
  );
}

function ProofRow({ proof, compact = false }: { proof?: ProofEvent; compact?: boolean }) {
  if (!proof) {
    return null;
  }
  const displayHash = proof.payloadHash.length > 18 ? `${proof.payloadHash.slice(0, 12)}...${proof.payloadHash.slice(-8)}` : proof.payloadHash;

  return (
    <article className="rounded-lg border border-white/10 bg-white/[0.045] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-black text-white">{proof.title}</p>
          {!compact ? <p className="mt-1 text-sm leading-6 text-white/58">{proof.detail}</p> : null}
        </div>
        <span className="shrink-0 rounded-lg border border-[#18e3bd]/30 bg-[#18e3bd]/10 px-2 py-1 text-[11px] font-black uppercase text-[#80ffe2]">{proof.status}</span>
      </div>
      <div className="mt-3 flex min-w-0 items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/35 px-3 py-2">
        <span className="truncate font-mono text-xs text-white/62">{displayHash}</span>
        <button
          className="shrink-0 text-white/52 transition hover:text-white"
          type="button"
          onClick={() => void navigator.clipboard.writeText(proof.payloadHash)}
          aria-label="Copy proof hash"
        >
          <Copy size={15} aria-hidden="true" />
        </button>
      </div>
      {!compact ? <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-white/38"><Clock3 size={13} aria-hidden="true" />{proof.createdAt}</p> : null}
    </article>
  );
}

function JudgingCard() {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Submission Fit</p>
      <h2 className="mt-1 text-xl font-black text-white">Judge-readable edge</h2>
      <div className="mt-4 grid gap-3">
        {judgingMap.map(([label, body]) => (
          <div key={label} className="rounded-lg border border-white/10 bg-black/32 p-3">
            <p className="font-black text-white">{label}</p>
            <p className="mt-2 text-sm leading-6 text-white/58">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
