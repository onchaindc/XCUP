"use client";

import { motion } from "framer-motion";
import { CheckCircle2, CircleDot, Goal, Shield, Shirt, Trophy, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatUnits } from "viem";
import { useAccount, useBalance, useConnect, useDisconnect } from "wagmi";
import type { LiveSportEvent } from "@/lib/sports";
import { xLayerTestnet } from "@/lib/arc";
import { errorMessage } from "@/lib/utils";
import { pickWalletConnector } from "@/lib/wallet";
import { KickoffLoader, TopHeader } from "@/components/XCupApp";

type PlayerPick = {
  id: string;
  name: string;
  team: string;
  role: "FWD" | "MID" | "DEF" | "GK";
};

const roles: PlayerPick["role"][] = ["GK", "DEF", "MID", "FWD"];
const penaltyTargets = ["Left", "Center", "Right"] as const;

export function GameFiPage() {
  const [showLoader, setShowLoader] = useState(true);
  const [events, setEvents] = useState<LiveSportEvent[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<PlayerPick[]>([]);
  const [keeperPick, setKeeperPick] = useState<(typeof penaltyTargets)[number] | null>(null);
  const [penaltyResult, setPenaltyResult] = useState("");
  const [lineupStatus, setLineupStatus] = useState("");
  const [walletError, setWalletError] = useState("");
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({
    address,
    chainId: xLayerTestnet.id,
    query: { enabled: Boolean(address) }
  });
  const { connectors, connectAsync, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const formattedBalance = balance ? `${Number(formatUnits(balance.value, balance.decimals)).toFixed(4)} ${balance.symbol}` : "0.0000 OKB";

  useEffect(() => {
    const timer = window.setTimeout(() => setShowLoader(false), 1200);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadEvents() {
      try {
        const response = await fetch("/api/sports/live", { cache: "no-store" });
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as { events: LiveSportEvent[] };
        if (!cancelled) {
          setEvents(data.events);
        }
      } catch {
        if (!cancelled) {
          setEvents([]);
        }
      }
    }
    void loadEvents();
    return () => {
      cancelled = true;
    };
  }, []);

  const playerPool = useMemo(() => makePlayerPool(events), [events]);
  const lineupScore = selectedPlayers.reduce((score, player, index) => score + player.name.length * 3 + (index + 1) * 4, 0);

  async function connectWallet() {
    const connector = pickWalletConnector(connectors);
    if (!connector) {
      setWalletError("No wallet connector detected.");
      return;
    }
    setWalletError("");
    try {
      await connectAsync({ connector, chainId: xLayerTestnet.id });
    } catch (error) {
      setWalletError(errorMessage(error, "Wallet connection failed."));
    }
  }

  function togglePlayer(player: PlayerPick) {
    setSelectedPlayers((current) => {
      if (current.some((item) => item.id === player.id)) {
        return current.filter((item) => item.id !== player.id);
      }
      if (current.length >= 5) {
        return current;
      }
      return [...current, player];
    });
  }

  function playPenalty(target: (typeof penaltyTargets)[number]) {
    setKeeperPick(target);
    const keeperDive = penaltyTargets[Math.floor(Math.random() * penaltyTargets.length)];
    const scored = keeperDive !== target;
    setPenaltyResult(scored ? `Goal. Keeper went ${keeperDive}.` : `Saved. Keeper read ${keeperDive}.`);
  }

  function lockLineup() {
    setLineupStatus(`Lineup locked for this matchday session with ${lineupScore} XP.`);
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
        {walletError ? <p className="mb-4 rounded-lg border border-[#ff5c39]/25 bg-[#ff5c39]/10 px-4 py-3 text-sm font-bold text-[#ffb09d]">{walletError}</p> : null}
        <header className="rounded-lg border border-white/10 bg-white/[0.045] p-4 sm:p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">GameFi</p>
          <h1 className="mt-2 text-3xl font-black tracking-normal text-white sm:text-5xl">Play the matchday layer</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60">
            Two simple playable loops for the hackathon build: fantasy lineup selection and a penalty duel.
          </p>
        </header>
        <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <FantasyLineup
            playerPool={playerPool}
            selectedPlayers={selectedPlayers}
            togglePlayer={togglePlayer}
            lineupScore={lineupScore}
            isConnected={isConnected}
            lineupStatus={lineupStatus}
            onLockLineup={lockLineup}
          />
          <PenaltyDuel keeperPick={keeperPick} penaltyResult={penaltyResult} playPenalty={playPenalty} />
        </section>
      </div>
    </main>
  );
}

function makePlayerPool(events: LiveSportEvent[]): PlayerPick[] {
  const teams = events.slice(0, 8).flatMap((event) => [event.homeTeam, event.awayTeam]);
  if (!teams.length) {
    return [];
  }
  return teams.slice(0, 20).map((team, index) => ({
    id: `${team.id ?? team.shortName}-${index}`,
    name: team.name,
    team: team.shortName,
    role: roles[index % roles.length]
  }));
}

function FantasyLineup({
  playerPool,
  selectedPlayers,
  togglePlayer,
  lineupScore,
  isConnected,
  lineupStatus,
  onLockLineup
}: {
  playerPool: PlayerPick[];
  selectedPlayers: PlayerPick[];
  togglePlayer: (player: PlayerPick) => void;
  lineupScore: number;
  isConnected: boolean;
  lineupStatus: string;
  onLockLineup: () => void;
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Fantasy XI Lite</p>
          <h2 className="mt-1 text-2xl font-black text-white">Select five</h2>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/35 p-3 text-right">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white/40">Lineup score</p>
          <p className="text-2xl font-black text-[#18e3bd]">{lineupScore}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="grid gap-2 sm:grid-cols-2">
          {playerPool.length ? playerPool.map((player) => {
            const selected = selectedPlayers.some((item) => item.id === player.id);
            return (
              <button
                key={player.id}
                className={`rounded-lg border p-3 text-left transition ${selected ? "border-[#18e3bd]/40 bg-[#18e3bd]/10" : "border-white/10 bg-black/35 hover:bg-white/[0.07]"}`}
                type="button"
                onClick={() => togglePlayer(player)}
              >
                <Shirt size={17} className={selected ? "text-[#18e3bd]" : "text-white/44"} aria-hidden="true" />
                <p className="mt-2 font-black text-white">{player.name}</p>
                <p className="mt-1 text-xs font-bold text-white/44">{player.role} - {player.team}</p>
              </button>
            );
          }) : (
            <div className="rounded-lg border border-white/10 bg-black/35 p-5 text-sm text-white/60 sm:col-span-2">
              Waiting for real sports feed teams. No fake fantasy roster is shown.
            </div>
          )}
        </div>
        <div className="rounded-lg border border-white/10 bg-black/35 p-4">
          <p className="font-black text-white">Your lineup</p>
          <div className="mt-3 grid gap-2">
            {selectedPlayers.map((player) => (
              <div key={player.id} className="flex items-center justify-between gap-2 rounded-md bg-white/[0.06] p-2 text-sm">
                <span className="font-bold text-white">{player.name}</span>
                <span className="text-white/42">{player.role}</span>
              </div>
            ))}
            {!selectedPlayers.length ? <p className="text-sm leading-6 text-white/54">Pick up to five real teams/players from the live board.</p> : null}
          </div>
          <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-white px-3 py-3 text-sm font-black text-black transition hover:bg-[#18e3bd] disabled:opacity-50" type="button" disabled={!isConnected || selectedPlayers.length < 5} onClick={onLockLineup}>
            <CheckCircle2 size={16} aria-hidden="true" />
            Lock Lineup
          </button>
          {lineupStatus ? <p className="mt-3 rounded-lg border border-[#18e3bd]/25 bg-[#18e3bd]/10 p-3 text-sm font-bold text-[#80ffe2]">{lineupStatus}</p> : null}
          {!isConnected ? <p className="mt-3 text-xs font-bold text-white/44">Connect wallet to lock lineup.</p> : null}
        </div>
      </div>
    </section>
  );
}

function PenaltyDuel({
  keeperPick,
  penaltyResult,
  playPenalty
}: {
  keeperPick: "Left" | "Center" | "Right" | null;
  penaltyResult: string;
  playPenalty: (target: "Left" | "Center" | "Right") => void;
}) {
  return (
    <aside className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Penalty Duel</p>
      <h2 className="mt-1 text-2xl font-black text-white">Pick your shot</h2>
      <div className="mt-5 rounded-lg border border-white/10 bg-black/35 p-4">
        <div className="grid aspect-[4/3] place-items-end rounded-lg border border-white/10 bg-[radial-gradient(circle_at_50%_70%,rgba(24,227,189,0.18),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-4">
          <motion.div className="grid h-20 w-full grid-cols-3 gap-2" animate={{ opacity: [0.65, 1, 0.65] }} transition={{ repeat: Infinity, duration: 2.2 }}>
            {penaltyTargets.map((target) => (
              <button
                key={target}
                className={`rounded-lg border text-xs font-black transition ${keeperPick === target ? "border-[#18e3bd]/50 bg-[#18e3bd]/20 text-white" : "border-white/10 bg-black/30 text-white/54 hover:bg-white/10 hover:text-white"}`}
                type="button"
                onClick={() => playPenalty(target)}
              >
                {target}
              </button>
            ))}
          </motion.div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Goal size={21} className="text-[#f5a524]" aria-hidden="true" />
          <p className="text-sm font-bold text-white/64">{penaltyResult || "Choose a direction to shoot."}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <MiniMetric icon={CircleDot} label="Shots" value={keeperPick ? "1" : "0"} />
        <MiniMetric icon={Shield} label="Mode" value="PvE" />
        <MiniMetric icon={Zap} label="XP" value={penaltyResult.startsWith("Goal") ? "+25" : "0"} />
      </div>
    </aside>
  );
}

function MiniMetric({ icon: Icon, label, value }: { icon: typeof Trophy; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/35 p-3">
      <Icon size={15} className="text-[#18e3bd]" aria-hidden="true" />
      <p className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-white/38">{label}</p>
      <p className="mt-1 font-black text-white">{value}</p>
    </div>
  );
}
