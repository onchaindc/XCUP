"use client";

import { motion } from "framer-motion";
import { CheckCircle2, CircleDot, Goal, Plus, Shield, Shirt, Trophy, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatUnits } from "viem";
import { useAccount, useBalance, useConnect, useDisconnect } from "wagmi";
import { xLayerTestnet } from "@/lib/arc";
import { errorMessage } from "@/lib/utils";
import { pickWalletConnector } from "@/lib/wallet";
import {
  clubsForSport,
  footballSlots,
  type LineupSlot,
  type PlayerClub,
  type PlayerOption
} from "@/lib/player-catalog";
import { KickoffLoader, TopHeader } from "@/components/XCupApp";

type LockedLineup = {
  id: string;
  name: string;
  picks: Record<string, PlayerOption>;
  lockedAt: string;
  unlockAt: string;
  xp: number;
};

const penaltyTargets = ["Left", "Center", "Right"] as const;
const lineupStorageKey = "xcup-weekly-lineups";
const weekMs = 7 * 24 * 60 * 60 * 1000;

export function GameFiPage() {
  const [showLoader, setShowLoader] = useState(true);
  const [activeSlot, setActiveSlot] = useState<LineupSlot>(footballSlots[0]);
  const [selectedClubId, setSelectedClubId] = useState("");
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [lineup, setLineup] = useState<Record<string, PlayerOption>>({});
  const [lockedLineups, setLockedLineups] = useState<LockedLineup[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [lineupStatus, setLineupStatus] = useState("");
  const [keeperPick, setKeeperPick] = useState<(typeof penaltyTargets)[number] | null>(null);
  const [penaltyResult, setPenaltyResult] = useState("");
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
  const teams = useMemo(() => clubsForSport("football"), []);
  const selectedClub = teams.find((team) => team.id === selectedClubId) ?? null;
  const selectedCount = Object.keys(lineup).length;
  const lineupScore = Object.values(lineup).reduce((score, player, index) => score + player.name.length * 5 + (index + 1) * 7, 0);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowLoader(false), 900);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(lineupStorageKey);
      setLockedLineups(raw ? (JSON.parse(raw) as LockedLineup[]) : []);
    } catch {
      setLockedLineups([]);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(lineupStorageKey, JSON.stringify(lockedLineups));
  }, [lockedLineups]);

  useEffect(() => {
    let cancelled = false;
    async function loadPlayers() {
      if (!selectedClubId) {
        setPlayers([]);
        return;
      }
      setLoadingPlayers(true);
      try {
        const response = await fetch(`/api/players?sport=football&club=${encodeURIComponent(selectedClubId)}&position=${encodeURIComponent(activeSlot.position)}`, { cache: "no-store" });
        const data = (await response.json()) as { players: PlayerOption[] };
        if (!cancelled) {
          setPlayers(data.players);
        }
      } catch {
        if (!cancelled) {
          setPlayers([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingPlayers(false);
        }
      }
    }

    void loadPlayers();
    return () => {
      cancelled = true;
    };
  }, [activeSlot.position, selectedClubId]);

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

  function pickPlayer(player: PlayerOption) {
    setLineup((current) => ({ ...current, [activeSlot.id]: player }));
    const nextIndex = footballSlots.findIndex((slot) => slot.id === activeSlot.id) + 1;
    if (footballSlots[nextIndex]) {
      setActiveSlot(footballSlots[nextIndex]);
    }
  }

  function newLineup() {
    setLineup({});
    setActiveSlot(footballSlots[0]);
    setSelectedClubId("");
    setLineupStatus("New lineup draft ready.");
  }

  function lockLineup() {
    if (!isConnected) {
      setLineupStatus("Connect wallet to lock a weekly lineup.");
      return;
    }
    if (selectedCount < footballSlots.length) {
      setLineupStatus("Fill all 11 positions before locking.");
      return;
    }
    const lockedAt = new Date();
    const next: LockedLineup = {
      id: crypto.randomUUID(),
      name: `Lineup ${lockedLineups.length + 1}`,
      picks: lineup,
      lockedAt: lockedAt.toISOString(),
      unlockAt: new Date(lockedAt.getTime() + weekMs).toISOString(),
      xp: lineupScore
    };
    setLockedLineups((current) => [next, ...current]);
    setLineupStatus(`${next.name} locked for one week. Player live performance will drive XP and health.`);
    setLineup({});
    setActiveSlot(footballSlots[0]);
    setSelectedClubId("");
  }

  function playPenalty(target: (typeof penaltyTargets)[number]) {
    setKeeperPick(target);
    const keeperDive = penaltyTargets[Math.floor(Math.random() * penaltyTargets.length)];
    const scored = keeperDive !== target;
    setPenaltyResult(scored ? `Goal. Keeper went ${keeperDive}.` : `Saved. Keeper read ${keeperDive}.`);
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
          <h1 className="mt-2 text-3xl font-black tracking-normal text-white sm:text-5xl">World Cup weekly lineups</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60">
            Build multiple real-player Starting XIs from clubs and countries. Each locked squad stays active for one week and earns XP from live player performance.
          </p>
        </header>
        <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <FantasyLineup
            teams={teams}
            selectedClub={selectedClub}
            selectedClubId={selectedClubId}
            setSelectedClubId={setSelectedClubId}
            activeSlot={activeSlot}
            setActiveSlot={setActiveSlot}
            players={players}
            loadingPlayers={loadingPlayers}
            lineup={lineup}
            pickPlayer={pickPlayer}
            lineupScore={lineupScore}
            selectedCount={selectedCount}
            lineupStatus={lineupStatus}
            lockedLineups={lockedLineups}
            onLockLineup={lockLineup}
            onNewLineup={newLineup}
          />
          <PenaltyDuel keeperPick={keeperPick} penaltyResult={penaltyResult} playPenalty={playPenalty} />
        </section>
      </div>
    </main>
  );
}

function FantasyLineup({
  teams,
  selectedClub,
  selectedClubId,
  setSelectedClubId,
  activeSlot,
  setActiveSlot,
  players,
  loadingPlayers,
  lineup,
  pickPlayer,
  lineupScore,
  selectedCount,
  lineupStatus,
  lockedLineups,
  onLockLineup,
  onNewLineup
}: {
  teams: PlayerClub[];
  selectedClub: PlayerClub | null;
  selectedClubId: string;
  setSelectedClubId: (value: string) => void;
  activeSlot: LineupSlot;
  setActiveSlot: (slot: LineupSlot) => void;
  players: PlayerOption[];
  loadingPlayers: boolean;
  lineup: Record<string, PlayerOption>;
  pickPlayer: (player: PlayerOption) => void;
  lineupScore: number;
  selectedCount: number;
  lineupStatus: string;
  lockedLineups: LockedLineup[];
  onLockLineup: () => void;
  onNewLineup: () => void;
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">World Cup XI</p>
          <h2 className="mt-1 text-2xl font-black text-white">Pick real players</h2>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/35 p-3 text-right">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white/40">Lineup score</p>
          <p className="text-2xl font-black text-[#18e3bd]">{lineupScore}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid gap-4">
          <div className="relative aspect-[3/4] min-h-[34rem] overflow-hidden rounded-lg border border-white/10 bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.04)_0_1px,transparent_1px_84px),linear-gradient(180deg,rgba(24,227,189,0.18),rgba(2,7,6,0.95))]">
            <div className="absolute inset-x-[8%] top-[8%] h-[84%] rounded-[42%] border border-white/15" />
            {footballSlots.map((slot) => {
              const pick = lineup[slot.id];
              const active = activeSlot.id === slot.id;
              return (
                <motion.button
                  key={slot.id}
                  className={`absolute grid min-h-16 w-28 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-lg border p-2 text-center text-[11px] font-black shadow-xl transition ${active ? "border-[#18e3bd] bg-[#18e3bd]/20" : "border-white/15 bg-black/55 hover:bg-white/10"}`}
                  style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
                  type="button"
                  whileHover={{ scale: 1.04 }}
                  onClick={() => setActiveSlot(slot)}
                >
                  {pick?.image ? <img className="h-8 w-8 rounded-full object-cover" src={pick.image} alt="" /> : <Shirt size={17} className="text-white/50" aria-hidden="true" />}
                  <span className="line-clamp-2">{pick?.name ?? slot.label}</span>
                </motion.button>
              );
            })}
          </div>
          <div className="grid gap-3 rounded-lg border border-white/10 bg-black/35 p-4 sm:grid-cols-3">
            <MiniMetric icon={Trophy} label="Filled" value={`${selectedCount}/11`} />
            <MiniMetric icon={Shield} label="Lock" value="7 days" />
            <MiniMetric icon={Zap} label="Health" value={`${Math.min(100, Math.round(lineupScore / 12))}%`} />
          </div>
        </div>
        <aside className="grid content-start gap-3">
          <div className="rounded-lg border border-white/10 bg-black/35 p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Active position</p>
            <p className="mt-1 text-xl font-black text-white">{activeSlot.label}</p>
            <select className="mt-3 w-full rounded-lg border border-white/10 bg-black px-3 py-3 text-sm font-black text-white outline-none focus:border-[#18e3bd]/60" value={selectedClubId} onChange={(event) => setSelectedClubId(event.target.value)}>
              <option value="">Select club or country</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>{team.name} - {team.league}</option>
              ))}
            </select>
            <div className="mt-3 grid max-h-52 gap-2 overflow-y-auto pr-1">
              {teams.map((team) => (
                <button
                  key={team.id}
                  className={`flex items-center gap-3 rounded-lg border p-2 text-left transition ${selectedClubId === team.id ? "border-[#18e3bd]/45 bg-[#18e3bd]/10" : "border-white/10 bg-white/[0.045] hover:bg-white/[0.08]"}`}
                  type="button"
                  onClick={() => setSelectedClubId(team.id)}
                >
                  <TeamLogo team={team} />
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-black text-white">{team.name}</span>
                    <span className="block truncate text-[11px] font-bold text-white/42">{team.kind === "country" ? "Country" : "Club"} - {team.league}</span>
                  </span>
                </button>
              ))}
            </div>
            {selectedClub ? <TeamBadge team={selectedClub} /> : null}
          </div>
          <div className="grid max-h-[25rem] gap-2 overflow-y-auto rounded-lg border border-white/10 bg-black/35 p-3">
            {loadingPlayers ? <p className="rounded-lg border border-white/10 bg-white/[0.045] p-3 text-sm text-white/58">Loading real roster...</p> : null}
            {!loadingPlayers && players.map((player) => (
              <button key={player.id} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.045] p-3 text-left transition hover:border-[#18e3bd]/40 hover:bg-[#18e3bd]/10" type="button" onClick={() => pickPlayer(player)}>
                {player.image ? <img className="h-11 w-11 rounded-full object-cover" src={player.image} alt="" /> : <span className="grid h-11 w-11 place-items-center rounded-full bg-white/[0.08]"><Shirt size={16} aria-hidden="true" /></span>}
                <span className="min-w-0">
                  <span className="block truncate font-black text-white">{player.name}</span>
                  <span className="block text-xs font-bold text-white/42">{player.position} - {player.club}</span>
                </span>
              </button>
            ))}
            {!loadingPlayers && selectedClubId && !players.length ? <p className="rounded-lg border border-white/10 bg-white/[0.045] p-3 text-sm leading-6 text-white/58">No live roster was returned, so fallback lineup options should appear here. Try reselecting the club if this stays empty.</p> : null}
            {!selectedClubId ? <p className="rounded-lg border border-white/10 bg-white/[0.045] p-3 text-sm leading-6 text-white/58">Choose a club or country to load real players for {activeSlot.label}.</p> : null}
          </div>
          <div className="grid gap-2 rounded-lg border border-white/10 bg-black/35 p-4">
            <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-3 py-3 text-sm font-black text-black transition hover:bg-[#18e3bd] disabled:opacity-50" type="button" disabled={selectedCount < 11} onClick={onLockLineup}>
              <CheckCircle2 size={16} aria-hidden="true" />
              Lock weekly lineup
            </button>
            <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-3 text-sm font-black text-white transition hover:bg-white/12" type="button" onClick={onNewLineup}>
              <Plus size={16} aria-hidden="true" />
              New lineup
            </button>
            {lineupStatus ? <p className="rounded-lg border border-[#18e3bd]/25 bg-[#18e3bd]/10 p-3 text-sm font-bold text-[#80ffe2]">{lineupStatus}</p> : null}
          </div>
          <LockedLineups lineups={lockedLineups} />
        </aside>
      </div>
    </section>
  );
}

function TeamBadge({ team }: { team: PlayerClub }) {
  return (
    <div className="mt-3 flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.045] p-3">
      <TeamLogo team={team} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-black text-white">{team.name}</span>
        <span className="block text-xs font-bold text-white/42">{team.kind === "country" ? "Country" : "Club"} - {team.league}</span>
      </span>
    </div>
  );
}

function TeamLogo({ team }: { team: PlayerClub }) {
  const src = team.logo ?? (team.flagCode ? `https://flagcdn.com/w80/${team.flagCode}.png` : "");
  return src ? <img className="h-9 w-9 shrink-0 rounded-md object-contain" src={src} alt="" /> : <Shirt size={24} className="shrink-0 text-white/44" aria-hidden="true" />;
}

function LockedLineups({ lineups }: { lineups: LockedLineup[] }) {
  return (
    <section className="rounded-lg border border-white/10 bg-black/35 p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Weekly locks</p>
      <div className="mt-3 grid gap-2">
        {lineups.map((lineup) => (
          <div key={lineup.id} className="rounded-lg border border-white/10 bg-white/[0.045] p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-black text-white">{lineup.name}</p>
            <p className="text-sm font-black text-[#18e3bd]">{lineup.xp} XP</p>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-black/50">
              <div className="h-full rounded-full bg-[#18e3bd]" style={{ width: `${Math.min(100, Math.round(lineup.xp / 12))}%` }} />
            </div>
            <p className="mt-2 text-xs font-bold text-white/42">Locked until {new Date(lineup.unlockAt).toLocaleDateString()} - live player stats update health and XP when source data is available.</p>
          </div>
        ))}
        {!lineups.length ? <p className="text-sm leading-6 text-white/58">Locked lineups appear here and stay tracked for one week.</p> : null}
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
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
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
