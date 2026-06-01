"use client";

import { motion } from "framer-motion";
import { ArrowRight, Crown, Landmark, Plus, Shield, Sparkles, Swords, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatUnits, keccak256, toBytes } from "viem";
import { useAccount, useBalance, useConnect, useDisconnect, useWriteContract } from "wagmi";
import { X_LAYER_EXPLORER_URL, xLayerTestnet } from "@/lib/arc";
import { errorMessage } from "@/lib/utils";
import { pickWalletConnector } from "@/lib/wallet";
import type { SquadRecord, SquadRole } from "@/lib/squads";
import { SiteFooter } from "@/components/SiteFooter";
import { KickoffLoader, TopHeader } from "@/components/XCupApp";

type SquadDraft = {
  name: string;
  motto: string;
  territory: string;
  role: SquadRole;
  accent: string;
};

const squadRoles: SquadRole[] = ["Captain", "Strategist", "Analyst", "Treasurer", "Scout"];
const squadAccents = ["#18e3bd", "#42a5ff", "#f5a524", "#ff5c39"];
const LOCAL_SQUADS_KEY = "xcup-local-squads";

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

export function SquadsPage() {
  const [showLoader, setShowLoader] = useState(true);
  const [squads, setSquads] = useState<SquadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [banner, setBanner] = useState("No squads yet. Create the first one.");
  const [draft, setDraft] = useState<SquadDraft>({
    name: "",
    motto: "",
    territory: "",
    role: "Captain",
    accent: squadAccents[0]
  });
  const [activeSquadId, setActiveSquadId] = useState("");
  const [joinedSquadIds, setJoinedSquadIds] = useState<Set<string>>(() => new Set());
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
    async function loadSquads() {
      if (squads.length) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      try {
        const response = await fetch("/api/squads", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Unable to load squads.");
        }
        const data = (await response.json()) as { squads: SquadRecord[] };
        if (!cancelled) {
          const mergedSquads = mergeSquads(data.squads, loadLocalSquads());
          setSquads(mergedSquads);
          persistLocalSquads(mergedSquads);
          setActiveSquadId((current) => current || mergedSquads[0]?.id || "");
          setBanner(mergedSquads.length ? "Create a squad or join one on the board." : "No squads yet. Be the first creator.");
        }
      } catch (error) {
        if (!cancelled) {
          const cachedSquads = loadLocalSquads();
          if (cachedSquads.length) {
            setSquads(cachedSquads);
            setActiveSquadId((current) => current || cachedSquads[0]?.id || "");
            setBanner("Showing saved squads while shared sync reconnects.");
          } else {
            setBanner(error instanceof Error ? error.message : "Unable to load squads.");
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    void loadSquads();
    const interval = window.setInterval(() => void loadSquads(), 12_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const metrics = useMemo(
    () => [
      { label: "Squads", value: String(squads.length), icon: Users },
      { label: "Joined", value: String(squads.filter((squad) => squad.members > 0).length), icon: Crown },
      { label: "Treasury", value: `${squads.length * 0} OKB`, icon: Landmark },
      { label: "Wars", value: "0", icon: Swords }
    ],
    [squads]
  );

  const activeSquad = squads.find((squad) => squad.id === activeSquadId) ?? null;

  async function connectWallet() {
    const connector = pickWalletConnector(connectors);
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

  async function createSquad() {
    if (!draft.name.trim()) {
      setBanner("Add a squad name first.");
      return;
    }

    try {
      const response = await fetch("/api/squads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "create",
          name: draft.name,
          motto: draft.motto,
          territory: draft.territory,
          role: draft.role,
          accent: draft.accent,
          address
        })
      });
      const data = (await response.json()) as { squad?: SquadRecord; error?: string };
      if (!response.ok || !data.squad) {
        throw new Error(data.error || "Unable to create squad.");
      }
      setSquads((current) => {
        const next = [data.squad!, ...current.filter((item) => item.id !== data.squad?.id)];
        persistLocalSquads(next);
        return next;
      });
      setActiveSquadId(data.squad.id);
      setDraft({ name: "", motto: "", territory: "", role: "Captain", accent: squadAccents[0] });
      setBanner(`Created ${data.squad.name}. It is now visible on the shared squad board.`);
    } catch (error) {
      setBanner(error instanceof Error ? error.message : "Unable to create squad.");
    }
  }

  async function joinSquad(squad: SquadRecord) {
    setActiveSquadId(squad.id);
    if (joinedSquadIds.has(squad.id)) {
      setBanner(`Already joined ${squad.name}.`);
      return;
    }
    if (!address) {
      setBanner("Connect wallet to join a squad.");
      return;
    }
    let txHash = "";

    try {
      const payload = JSON.stringify({ squadId: squad.id, fan: address, joinedAt: new Date().toISOString() });
      const contractAddress = arenaAddress();
      if (contractAddress && isConnected) {
        txHash = await writeContractAsync({
          address: contractAddress,
          abi: xCupArenaAbi,
          functionName: "joinSquad",
          args: [keccak256(toBytes(squad.id)), keccak256(toBytes(payload))],
          chainId: xLayerTestnet.id
        });
      }

      const response = await fetch("/api/squads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "join", id: squad.id, address })
      });
      const data = (await response.json()) as { squad?: SquadRecord; error?: string };
      if (!response.ok || !data.squad) {
        throw new Error(data.error || "Unable to join squad.");
      }
      setSquads((current) => {
        const next = current.map((item) => (item.id === squad.id ? data.squad! : item));
        persistLocalSquads(next);
        return next;
      });
      setJoinedSquadIds((current) => new Set(current).add(squad.id));
      setBanner(txHash ? `Joined ${squad.name}. Tx ${txHash.slice(0, 10)}...` : `Joined ${squad.name}. Shared roster updated.`);
    } catch (error) {
      setBanner(error instanceof Error ? error.message : "Unable to join squad.");
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
        <section className="rounded-lg border border-white/10 bg-black">
          <div className="relative z-10 grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="flex min-h-[18rem] flex-col justify-between">
              <div>
                <p className="text-lg font-light tracking-normal text-white sm:text-2xl">Squads</p>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/62">
                  Create squads, join squads, and coordinate live World Cup strategy on X Layer.
                </p>
              </div>
              <div>
                <h1 className="max-w-3xl text-3xl font-black leading-[1.02] tracking-normal text-white sm:text-4xl lg:text-5xl">
                  Build a real squad. Join the board.
                </h1>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-black text-black transition hover:bg-[#18e3bd]" type="button" onClick={() => document.getElementById("create-squad")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                    Create squad
                    <Plus size={16} aria-hidden="true" />
                  </button>
                  <button className="flex items-center gap-2 rounded-lg border border-white/12 bg-white/[0.06] px-3 py-2 text-sm font-black text-white transition hover:bg-white/12" type="button" onClick={() => document.getElementById("discover-squads")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                    Join squad
                    <Users size={16} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
            <div className="grid content-end gap-3">
              <div className="rounded-lg border border-white/10 bg-black/55 p-4 backdrop-blur-md">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Squad hub</p>
                <p className="mt-3 text-xl font-black text-white">{activeSquad ? activeSquad.name : "No squads yet"}</p>
                <p className="mt-2 text-sm leading-6 text-white/58">{activeSquad ? activeSquad.motto : "Create the first squad to start the board."}</p>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {metrics.map((metric) => (
                  <motion.div key={metric.label} className="rounded-lg border border-white/10 bg-black/55 p-3 backdrop-blur-md">
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
                {loading && !squads.length ? <div className="md:col-span-2 rounded-lg border border-white/10 bg-black/35 p-5 text-sm text-white/60">No squads yet. The first squad you create will appear here for everyone.</div> : null}
                {!loading && squads.map((squad, index) => (
                  <motion.article key={squad.id} className="rounded-lg border border-white/10 bg-black/35 p-4" initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ delay: index * 0.05 }}>
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
                    <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <MiniStat label="Members" value={String(squad.members)} />
                      <MiniStat label="Territory" value={squad.territory} />
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-black text-black transition hover:bg-[#18e3bd] disabled:cursor-not-allowed disabled:opacity-60" type="button" disabled={isWriting || joinedSquadIds.has(squad.id)} onClick={() => void joinSquad(squad)}>
                        {joinedSquadIds.has(squad.id) ? "Joined" : "Join"}
                        <ArrowRight size={16} aria-hidden="true" />
                      </button>
                      <Link className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/12 bg-white/[0.06] px-3 py-2 text-sm font-black text-white transition hover:bg-white/12" href={`/squads/${encodeURIComponent(squad.id)}`}>
                        Explore
                        <Sparkles size={16} aria-hidden="true" />
                      </Link>
                    </div>
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
                  <input className="rounded-lg border border-white/10 bg-black/35 px-3 py-3 text-base font-black text-white outline-none focus:border-[#18e3bd]/60" value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} placeholder="e.g. Matchday Crew" />
                </label>
                <label className="grid gap-2 text-sm font-bold text-white/58">
                  Primary role
                  <select className="rounded-lg border border-white/10 bg-black/35 px-3 py-3 text-base font-black text-white outline-none focus:border-[#18e3bd]/60" value={draft.role} onChange={(event) => updateDraft("role", event.target.value as SquadRole)}>
                    {squadRoles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-bold text-white/58">
                  Motto
                  <input className="rounded-lg border border-white/10 bg-black/35 px-3 py-3 text-base font-black text-white outline-none focus:border-[#18e3bd]/60" value={draft.motto} onChange={(event) => updateDraft("motto", event.target.value)} placeholder="Counter-press every market." />
                </label>
                <label className="grid gap-2 text-sm font-bold text-white/58">
                  Territory
                  <input className="rounded-lg border border-white/10 bg-black/35 px-3 py-3 text-base font-black text-white outline-none focus:border-[#18e3bd]/60" value={draft.territory} onChange={(event) => updateDraft("territory", event.target.value)} placeholder="West Africa" />
                </label>
                <label className="grid gap-2 text-sm font-bold text-white/58 md:col-span-2">
                  Accent
                  <div className="flex flex-wrap gap-2">
                    {squadAccents.map((accent) => (
                      <button key={accent} className={`h-10 w-10 rounded-full border ${draft.accent === accent ? "border-white" : "border-white/15"}`} style={{ backgroundColor: accent }} type="button" onClick={() => updateDraft("accent", accent)} aria-label={`Select accent ${accent}`} />
                    ))}
                  </div>
                </label>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-black text-black transition hover:bg-[#18e3bd] disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={() => void createSquad()}>
                  <Plus size={16} aria-hidden="true" />
                  Create squad
                </button>
                {!isConnected ? <span className="text-xs font-bold text-white/44">Connect wallet for onchain join proofs.</span> : null}
              </div>
            </section>
          </div>

          <aside className="grid content-start gap-4">
            <section className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">My squad</p>
              <h2 className="mt-1 text-xl font-black text-white">{activeSquad ? activeSquad.name : "No active squad"}</h2>
              <p className="mt-2 text-sm leading-6 text-white/60">{activeSquad ? activeSquad.motto : "Join a squad to activate your roster."}</p>
            </section>

            <section className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Squad matches</p>
                  <h2 className="mt-1 text-xl font-black text-white">Active matches</h2>
                </div>
                <Swords size={18} className="text-[#f5a524]" aria-hidden="true" />
              </div>
              <Link className="mt-4 flex items-center justify-between rounded-lg border border-white/10 bg-black/35 p-3 text-sm font-black text-white transition hover:bg-white/[0.07]" href={activeSquad ? `/squads/${encodeURIComponent(activeSquad.id)}` : "#discover-squads"}>
                <span>{activeSquad ? "Open squad arena" : "Create or join a squad first"}</span>
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
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

            {arenaAddress() ? (
              <section className="rounded-lg border border-white/10 bg-black/35 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">X Layer</p>
                <p className="mt-2 break-all text-sm leading-6 text-white/60">{arenaAddress()}</p>
                <a className="mt-3 inline-flex items-center gap-2 text-sm font-black text-[#18e3bd]" href={`${X_LAYER_EXPLORER_URL}/address/${arenaAddress()}`} target="_blank" rel="noreferrer">
                  Open explorer
                  <ArrowRight size={14} aria-hidden="true" />
                </a>
              </section>
            ) : null}
          </aside>
        </section>
        <SiteFooter />
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

function arenaAddress() {
  const configured = process.env.NEXT_PUBLIC_XCUP_ARENA_ADDRESS;
  return configured && configured.startsWith("0x") ? (configured as `0x${string}`) : undefined;
}

function loadLocalSquads() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_SQUADS_KEY);
    return raw ? (JSON.parse(raw) as SquadRecord[]) : [];
  } catch {
    return [];
  }
}

function persistLocalSquads(squads: SquadRecord[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_SQUADS_KEY, JSON.stringify(squads.slice(0, 80)));
  } catch {
  }
}

function mergeSquads(remote: SquadRecord[], local: SquadRecord[]) {
  const seen = new Set<string>();
  return [...remote, ...local].filter((squad) => {
    if (seen.has(squad.id)) return false;
    seen.add(squad.id);
    return true;
  });
}
