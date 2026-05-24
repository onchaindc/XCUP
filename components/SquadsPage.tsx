"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Crown,
  Landmark,
  Plus,
  Shield,
  Sparkles,
  Swords,
  Users
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatUnits, isAddress, keccak256, toBytes } from "viem";
import { useAccount, useBalance, useConnect, useDisconnect, useWriteContract } from "wagmi";
import { X_LAYER_EXPLORER_URL, xLayerTestnet } from "@/lib/arc";
import { errorMessage } from "@/lib/utils";
import { KickoffLoader, TopHeader } from "@/components/XCupApp";

type SquadRole = "Captain" | "Strategist" | "Analyst" | "Treasurer" | "Scout";

type SquadCard = {
  id: string;
  name: string;
  motto: string;
  role: SquadRole;
  level: number;
  elo: number;
  treasury: string;
  accuracy: string;
  territory: string;
  accent: string;
  members: number;
  joined: boolean;
};

type SquadDraft = {
  name: string;
  motto: string;
  territory: string;
  role: SquadRole;
  accent: string;
};

const squadRoles: SquadRole[] = ["Captain", "Strategist", "Analyst", "Treasurer", "Scout"];
const squadAccents = ["#18e3bd", "#42a5ff", "#f5a524", "#ff5c39"];

const seedSquads: SquadCard[] = [
  {
    id: "lagos-ultras",
    name: "Lagos Ultras",
    motto: "Counter-press every market.",
    role: "Captain",
    level: 18,
    elo: 1842,
    treasury: "412 OKB",
    accuracy: "68%",
    territory: "West Africa",
    accent: "#18e3bd",
    members: 24,
    joined: false
  },
  {
    id: "catalan-signal",
    name: "Catalan Signal",
    motto: "Possession models, ruthless timing.",
    role: "Strategist",
    level: 21,
    elo: 1916,
    treasury: "588 OKB",
    accuracy: "72%",
    territory: "Iberia",
    accent: "#42a5ff",
    members: 31,
    joined: false
  },
  {
    id: "north-london-war-room",
    name: "North London War Room",
    motto: "Scout reports before sentiment moves.",
    role: "Analyst",
    level: 16,
    elo: 1764,
    treasury: "336 OKB",
    accuracy: "64%",
    territory: "UK",
    accent: "#f5a524",
    members: 19,
    joined: false
  },
  {
    id: "samba-desk",
    name: "Samba Desk",
    motto: "High tempo, high trust, no noise.",
    role: "Treasurer",
    level: 20,
    elo: 1878,
    treasury: "501 OKB",
    accuracy: "70%",
    territory: "South America",
    accent: "#ff5c39",
    members: 27,
    joined: false
  }
];

const squadWars = [
  { match: "Lagos Ultras VS Catalan Signal", prize: "Founder Badge", status: "Arming strategy" },
  { match: "North London War Room VS Samba Desk", prize: "Treasury boost", status: "Scout phase" },
  { match: "Madrid Block VS City Chain", prize: "Prestige XP", status: "Pending live fixture" }
];

const xCupArenaAbi = [
  {
    type: "function",
    name: "joinSquad",
    stateMutability: "nonpayable",
    inputs: [
      { name: "squadId", type: "bytes32" },
      { name: "payloadHash", type: "bytes32" }
    ],
    outputs: [{ name: "eventId", type: "uint256" }]
  }
] as const;

const configuredArenaAddress = process.env.NEXT_PUBLIC_XCUP_ARENA_ADDRESS;
const arenaAddress = configuredArenaAddress && isAddress(configuredArenaAddress) ? (configuredArenaAddress as `0x${string}`) : undefined;

export function SquadsPage() {
  const [showLoader, setShowLoader] = useState(true);
  const hydrationRef = useRef(false);
  const [squads, setSquads] = useState<SquadCard[]>(() => {
    if (typeof window === "undefined") {
      return seedSquads;
    }
    const raw = window.localStorage.getItem("xcup-squads-state");
    if (!raw) {
      return seedSquads;
    }
    try {
      const parsed = JSON.parse(raw) as { squads?: SquadCard[] };
      return Array.isArray(parsed.squads) && parsed.squads.length ? parsed.squads : seedSquads;
    } catch {
      return seedSquads;
    }
  });
  const [activeSquadId, setActiveSquadId] = useState(() => {
    if (typeof window === "undefined") {
      return seedSquads[0]?.id ?? "";
    }
    const raw = window.localStorage.getItem("xcup-squads-state");
    if (!raw) {
      return seedSquads[0]?.id ?? "";
    }
    try {
      const parsed = JSON.parse(raw) as { activeSquadId?: string };
      return typeof parsed.activeSquadId === "string" ? parsed.activeSquadId : seedSquads[0]?.id ?? "";
    } catch {
      return seedSquads[0]?.id ?? "";
    }
  });
  const [banner, setBanner] = useState("Create a squad or join an existing one.");
  const [draft, setDraft] = useState<SquadDraft>({
    name: "",
    motto: "",
    territory: "",
    role: "Captain",
    accent: squadAccents[0]
  });
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
    if (!hydrationRef.current) {
      hydrationRef.current = true;
      return;
    }
    window.localStorage.setItem("xcup-squads-state", JSON.stringify({ squads, activeSquadId }));
  }, [activeSquadId, squads]);

  const metrics = useMemo(
    () => [
      { label: "Squads", value: String(squads.length), icon: Users },
      { label: "Joined", value: String(squads.filter((squad) => squad.joined).length), icon: Crown },
      { label: "Treasury", value: squads.reduce((total, squad) => total + Number.parseInt(squad.treasury), 0).toString() + " OKB", icon: Landmark },
      { label: "Wars", value: String(squadWars.length), icon: Swords }
    ],
    [squads]
  );

  const activeSquad = squads.find((squad) => squad.id === activeSquadId) ?? squads[0] ?? null;

  async function connectWallet() {
    const connector = connectors[0];
    if (!connector) {
      setBanner("No wallet connector detected.");
      return;
    }
    try {
      await connectAsync({ connector, chainId: xLayerTestnet.id });
    } catch (error) {
      setBanner(errorMessage(error, "Wallet connection failed."));
    }
  }

  function updateDraft<K extends keyof SquadDraft>(field: K, value: SquadDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function createSquad() {
    if (!draft.name.trim()) {
      setBanner("Add a squad name first.");
      return;
    }

    const id = draft.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const nextSquad: SquadCard = {
      id,
      name: draft.name.trim(),
      motto: draft.motto.trim() || "Fresh squad, fresh tactics.",
      role: draft.role,
      level: 1,
      elo: 1500,
      treasury: "0 OKB",
      accuracy: "0%",
      territory: draft.territory.trim() || "Global",
      accent: draft.accent,
      members: 1,
      joined: true
    };

    setSquads((current) => [nextSquad, ...current.filter((squad) => squad.id !== id)]);
    setActiveSquadId(id);
    setDraft({
      name: "",
      motto: "",
      territory: "",
      role: "Captain",
      accent: squadAccents[0]
    });
    setBanner(`Created ${nextSquad.name}. You are in.`);
  }

  async function joinSquad(squad: SquadCard) {
    if (squad.joined) {
      setActiveSquadId(squad.id);
      setBanner(`Already in ${squad.name}.`);
      return;
    }

    setActiveSquadId(squad.id);
    setBanner(`Joining ${squad.name}...`);

    if (arenaAddress && isConnected) {
      try {
        const squadId = keccak256(toBytes(squad.id));
        const payloadHash = keccak256(
          toBytes(
            JSON.stringify({
              squadId: squad.id,
              fan: address ?? "guest",
              joinedAt: new Date().toISOString()
            })
          )
        );
        const txHash = await writeContractAsync({
          address: arenaAddress,
          abi: xCupArenaAbi,
          functionName: "joinSquad",
          args: [squadId, payloadHash],
          chainId: xLayerTestnet.id
        });
        setBanner(`Joined ${squad.name} on X Layer. Tx ${txHash.slice(0, 10)}...`);
      } catch (error) {
        setBanner(errorMessage(error, "Join request failed."));
        return;
      }
    } else {
      setBanner(`Joined ${squad.name} locally.`);
    }

    setSquads((current) =>
      current.map((item) => (item.id === squad.id ? { ...item, joined: true, members: item.members + 1 } : item))
    );
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
        <section className="overflow-hidden rounded-lg border border-white/10 bg-black">
          <div className="absolute inset-0 opacity-90">
            <div className="x-squad-grid" />
          </div>
          <div className="relative z-10 grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="flex min-h-[20rem] flex-col justify-between">
              <div>
                <p className="text-2xl font-light tracking-normal text-white sm:text-3xl">Squads</p>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/62">
                  Create squads, join squads, and coordinate live World Cup strategy on X Layer.
                </p>
              </div>
              <div>
                <div className="mb-4 flex flex-wrap gap-2">
                  {["Create squad", "Join squad", "Live roster", "Onchain proof"].map((item) => (
                    <span key={item} className="rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs font-bold text-white/70">
                      {item}
                    </span>
                  ))}
                </div>
                <h1 className="max-w-3xl text-4xl font-black leading-[1.02] tracking-normal text-white sm:text-5xl lg:text-6xl">
                  Build your squad. Conquer the World Cup.
                </h1>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-black text-black transition hover:bg-[#18e3bd]"
                    type="button"
                    onClick={() => document.getElementById("create-squad")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  >
                    Create squad
                    <Plus size={16} aria-hidden="true" />
                  </button>
                  <button
                    className="flex items-center gap-2 rounded-lg border border-white/12 bg-white/[0.06] px-3 py-2 text-sm font-black text-white transition hover:bg-white/12"
                    type="button"
                    onClick={() => document.getElementById("discover-squads")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  >
                    Join squad
                    <Users size={16} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
            <div className="grid content-end gap-3">
              <div className="rounded-lg border border-white/10 bg-black/55 p-4 backdrop-blur-md">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Squad hub</p>
                <p className="mt-3 text-xl font-black text-white">{activeSquad ? activeSquad.name : "No squad selected"}</p>
                <p className="mt-2 text-sm leading-6 text-white/58">
                  {activeSquad ? activeSquad.motto : "Create a squad or join an active roster to start building reputation."}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {metrics.map((metric) => (
                  <motion.div
                    key={metric.label}
                    className="rounded-lg border border-white/10 bg-black/55 p-3 backdrop-blur-md"
                    animate={{ opacity: [0.78, 1, 0.78] }}
                    transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/42">{metric.label}</p>
                      <metric.icon size={14} className="text-[#18e3bd]" aria-hidden="true" />
                    </div>
                    <p className="mt-2 truncate text-lg font-black text-white">{metric.value}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <p className="mt-4 rounded-lg border border-white/10 bg-white/[0.045] px-4 py-3 text-sm font-medium text-white/70">{banner}</p>

        <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="grid gap-4">
            <div id="discover-squads" className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Discover squads</p>
                  <h2 className="mt-1 text-2xl font-black text-white">Live roster board</h2>
                </div>
                <Sparkles size={18} className="text-[#18e3bd]" aria-hidden="true" />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {squads.map((squad, index) => (
                  <motion.article
                    key={squad.id}
                    className="rounded-lg border border-white/10 bg-black/35 p-4"
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white/40">{squad.role}</p>
                        <h3 className="mt-2 text-xl font-black text-white">{squad.name}</h3>
                      </div>
                      <span className="grid h-11 w-11 place-items-center rounded-lg border border-white/10 bg-white/[0.06]" style={{ color: squad.accent }}>
                        <Crown size={21} aria-hidden="true" />
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-white/58">{squad.motto}</p>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <MiniStat label="Level" value={String(squad.level)} />
                      <MiniStat label="ELO" value={String(squad.elo)} />
                      <MiniStat label="Accuracy" value={squad.accuracy} />
                      <MiniStat label="Members" value={String(squad.members)} />
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.045] p-3">
                      <span className="text-xs font-black uppercase tracking-[0.14em] text-white/38">Territory</span>
                      <span className="text-sm font-black text-[#18e3bd]">{squad.territory}</span>
                    </div>
                    <button
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-black text-black transition hover:bg-[#18e3bd] disabled:cursor-not-allowed disabled:opacity-60"
                      type="button"
                      disabled={isWriting}
                      onClick={() => void joinSquad(squad)}
                    >
                      {squad.joined ? "Joined" : "Join squad"}
                      <ArrowRight size={16} aria-hidden="true" />
                    </button>
                  </motion.article>
                ))}
              </div>
            </div>

            <section id="create-squad" className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Create squad</p>
                  <h2 className="mt-1 text-2xl font-black text-white">Start a new roster</h2>
                </div>
                <Shield size={18} className="text-[#18e3bd]" aria-hidden="true" />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold text-white/58">
                  Squad name
                  <input
                    className="rounded-lg border border-white/10 bg-black/35 px-3 py-3 text-base font-black text-white outline-none focus:border-[#18e3bd]/60"
                    value={draft.name}
                    onChange={(event) => updateDraft("name", event.target.value)}
                    placeholder="e.g. Lagos Ultras"
                  />
                </label>
                <label className="grid gap-2 text-sm font-bold text-white/58">
                  Primary role
                  <select
                    className="rounded-lg border border-white/10 bg-black/35 px-3 py-3 text-base font-black text-white outline-none focus:border-[#18e3bd]/60"
                    value={draft.role}
                    onChange={(event) => updateDraft("role", event.target.value as SquadRole)}
                  >
                    {squadRoles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-bold text-white/58">
                  Motto
                  <input
                    className="rounded-lg border border-white/10 bg-black/35 px-3 py-3 text-base font-black text-white outline-none focus:border-[#18e3bd]/60"
                    value={draft.motto}
                    onChange={(event) => updateDraft("motto", event.target.value)}
                    placeholder="Counter-press every market."
                  />
                </label>
                <label className="grid gap-2 text-sm font-bold text-white/58">
                  Territory
                  <input
                    className="rounded-lg border border-white/10 bg-black/35 px-3 py-3 text-base font-black text-white outline-none focus:border-[#18e3bd]/60"
                    value={draft.territory}
                    onChange={(event) => updateDraft("territory", event.target.value)}
                    placeholder="West Africa"
                  />
                </label>
                <label className="grid gap-2 text-sm font-bold text-white/58 md:col-span-2">
                  Accent
                  <div className="flex flex-wrap gap-2">
                    {squadAccents.map((accent) => (
                      <button
                        key={accent}
                        className={`h-10 w-10 rounded-full border ${draft.accent === accent ? "border-white" : "border-white/15"}`}
                        style={{ backgroundColor: accent }}
                        type="button"
                        onClick={() => updateDraft("accent", accent)}
                        aria-label={`Select accent ${accent}`}
                      />
                    ))}
                  </div>
                </label>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-black text-black transition hover:bg-[#18e3bd] disabled:cursor-not-allowed disabled:opacity-60"
                  type="button"
                  onClick={createSquad}
                >
                  <Plus size={16} aria-hidden="true" />
                  Create squad
                </button>
                {!isConnected ? <span className="text-xs font-bold text-white/44">Wallet optional, but connect for onchain join proofs.</span> : null}
              </div>
            </section>
          </div>

          <aside className="grid content-start gap-4">
            <section className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">My squad</p>
              <h2 className="mt-1 text-xl font-black text-white">{activeSquad ? activeSquad.name : "No active squad"}</h2>
              <p className="mt-2 text-sm leading-6 text-white/60">
                {activeSquad ? activeSquad.motto : "Join a squad to activate your roster and treasury."}
              </p>
              <div className="mt-4 grid gap-2">
                {activeSquad ? (
                  <>
                    <StatRow label="Role" value={activeSquad.role} />
                    <StatRow label="Treasury" value={activeSquad.treasury} />
                    <StatRow label="Accuracy" value={activeSquad.accuracy} />
                    <StatRow label="Members" value={String(activeSquad.members)} />
                  </>
                ) : null}
              </div>
            </section>

            <section className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Squad wars</p>
                  <h2 className="mt-1 text-xl font-black text-white">Live rivalry board</h2>
                </div>
                <Swords size={18} className="text-[#f5a524]" aria-hidden="true" />
              </div>
              <div className="mt-4 grid gap-2">
                {squadWars.map((war) => (
                  <div key={war.match} className="grid gap-2 rounded-lg border border-white/10 bg-black/35 p-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
                    <div>
                      <p className="font-black text-white">{war.match}</p>
                      <p className="mt-1 text-xs font-bold text-white/42">{war.status}</p>
                    </div>
                    <p className="text-sm font-black text-[#18e3bd] sm:text-right">{war.prize}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Onchain loop</p>
              <div className="mt-4 grid gap-3">
                {[
                  ["Create", "Draft a squad identity and lock the roster"],
                  ["Join", "Connect wallet and submit squad membership"],
                  ["Compete", "Watch live picks update squad reputation"],
                  ["Evolve", "Treasury and accuracy shape the leaderboard"]
                ].map(([label, body]) => (
                  <div key={label} className="flex gap-3">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#18e3bd] shadow-[0_0_18px_rgba(24,227,189,0.8)]" />
                    <p className="text-sm leading-6 text-white/62">
                      <b className="text-white">{label}</b> - {body}
                    </p>
                  </div>
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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.045] p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-white/38">{label}</p>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/35 px-3 py-2">
      <span className="text-xs font-black uppercase tracking-[0.12em] text-white/38">{label}</span>
      <span className="text-sm font-black text-white">{value}</span>
    </div>
  );
}
