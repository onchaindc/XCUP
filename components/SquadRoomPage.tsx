"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  BarChart3,
  Crown,
  Gift,
  ImagePlus,
  Laugh,
  MessageCircle,
  Paperclip,
  Send,
  Sparkles,
  Swords,
  Trophy,
  Users,
  Vote,
  X,
  Zap
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatUnits } from "viem";
import { useAccount, useBalance, useConnect, useDisconnect } from "wagmi";
import type { SquadMessage, SquadRoom } from "@/lib/squads";
import { xLayerTestnet } from "@/lib/arc";
import { pickWalletConnector } from "@/lib/wallet";
import { errorMessage } from "@/lib/utils";
import { KickoffLoader, TopHeader } from "@/components/XCupApp";

type Tab = "overview" | "chat" | "captain";
type Modal = "stocks" | "shootout" | "xi" | null;

const gifPicks = [
  "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif",
  "https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/giphy.gif",
  "https://media.giphy.com/media/3o6Zt6ML6BklcajjsA/giphy.gif"
];

export function SquadRoomPage({ id }: { id: string }) {
  const [showLoader, setShowLoader] = useState(true);
  const [room, setRoom] = useState<SquadRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [tab, setTab] = useState<Tab>("overview");
  const [modal, setModal] = useState<Modal>(null);
  const [message, setMessage] = useState("");
  const [replyTo, setReplyTo] = useState<SquadMessage | null>(null);
  const [attachment, setAttachment] = useState<SquadMessage["attachment"]>(null);
  const [typing, setTyping] = useState(false);
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({
    address,
    chainId: xLayerTestnet.id,
    query: { enabled: Boolean(address) }
  });
  const { connectors, connectAsync, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const formattedBalance = balance ? `${Number(formatUnits(balance.value, balance.decimals)).toFixed(4)} ${balance.symbol}` : "0.0000 OKB";
  const onlineMembers = room?.members.filter((member) => member.online) ?? [];
  const pinned = room?.messages.find((item) => item.pinned) ?? room?.messages[0] ?? null;
  const captainLeader = room?.captainVotes.slice().sort((a, b) => b.votes - a.votes)[0] ?? null;

  useEffect(() => {
    const timer = window.setTimeout(() => setShowLoader(false), 900);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadRoom() {
      try {
        const response = await fetch(`/api/squads/${encodeURIComponent(id)}`, { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Squad room unavailable.");
        }
        const data = (await response.json()) as { room: SquadRoom };
        if (!cancelled) {
          setRoom(data.room);
          setStatus("");
        }
      } catch (error) {
        if (!cancelled) {
          setStatus(error instanceof Error ? error.message : "Unable to load squad room.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadRoom();
    const interval = window.setInterval(() => void loadRoom(), 20_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [id]);

  async function connectWallet() {
    const connector = pickWalletConnector(connectors);
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

  async function roomAction(payload: Record<string, unknown>) {
    if (!address) {
      setStatus("Connect wallet to interact inside the squad.");
      return;
    }

    const response = await fetch(`/api/squads/${encodeURIComponent(id)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...payload, address })
    });
    const data = (await response.json()) as { room?: SquadRoom; error?: string };
    if (!response.ok || !data.room) {
      setStatus(data.error || "Squad action failed.");
      return;
    }
    setRoom(data.room);
    setStatus("");
  }

  async function sendMessage() {
    if (!message.trim() && !attachment) {
      return;
    }
    await roomAction({ action: "message", body: message, attachment, replyTo: replyTo?.id ?? null });
    setMessage("");
    setReplyTo(null);
    setAttachment(null);
    setTyping(false);
  }

  const tabs = useMemo(
    () => [
      { id: "overview" as const, label: "Overview", icon: Trophy },
      { id: "chat" as const, label: "Chat", icon: MessageCircle },
      { id: "captain" as const, label: "Captain", icon: Vote }
    ],
    []
  );

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

        <Link className="mb-4 inline-flex w-fit items-center gap-2 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm font-black text-white transition hover:bg-white/10" href="/squads">
          <ArrowLeft size={16} aria-hidden="true" />
          Squads
        </Link>

        {loading ? <div className="h-80 animate-pulse rounded-lg border border-white/10 bg-white/[0.045]" /> : null}
        {!loading && status && !room ? <p className="rounded-lg border border-[#ff5c39]/25 bg-[#ff5c39]/10 p-4 text-sm font-bold text-[#ffb09d]">{status}</p> : null}

        {room ? (
          <>
            <section className="relative overflow-hidden rounded-lg border border-white/10 bg-black">
              <div className="absolute inset-0 opacity-80">
                <div className="x-reference-grid" />
              </div>
              <div className="relative z-10 grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Squad arena</p>
                  <h1 className="mt-2 text-4xl font-black leading-tight text-white sm:text-6xl">{room.squad.name}</h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-white/62">{room.squad.motto}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {["Online", "Live activity", "Ranking", "Competitions"].map((item) => (
                      <span key={item} className="rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs font-bold text-white/70">{item}</span>
                    ))}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Metric icon={Users} label="Online" value={String(onlineMembers.length)} />
                  <Metric icon={BarChart3} label="Ranking" value={String(room.ranking)} />
                  <Metric icon={Crown} label="Captain" value={captainLeader?.candidate ? short(captainLeader.candidate) : "Open"} />
                </div>
              </div>
            </section>

            <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
              <div className="grid gap-4">
                <div className="rounded-lg border border-white/10 bg-white/[0.045] p-2">
                  <div className="grid grid-cols-3 gap-1">
                    {tabs.map((item) => (
                      <button key={item.id} className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-black transition ${tab === item.id ? "bg-white text-black" : "text-white/56 hover:bg-white/10 hover:text-white"}`} type="button" onClick={() => setTab(item.id)}>
                        <item.icon size={15} aria-hidden="true" />
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {tab === "overview" ? (
                    <motion.section key="overview" className="grid gap-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                      <QuickActions openModal={setModal} />
                      <ActivityPanel room={room} />
                    </motion.section>
                  ) : null}
                  {tab === "chat" ? (
                    <motion.section key="chat" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                      <ChatPanel
                        room={room}
                        message={message}
                        replyTo={replyTo}
                        attachment={attachment}
                        typing={typing}
                        setMessage={setMessage}
                        setReplyTo={setReplyTo}
                        setTyping={setTyping}
                        setAttachment={setAttachment}
                        sendMessage={sendMessage}
                        react={(messageId, emoji) => void roomAction({ action: "reaction", messageId, emoji })}
                        tip={(to) => void roomAction({ action: "tip", to, amount: "5" })}
                      />
                    </motion.section>
                  ) : null}
                  {tab === "captain" ? (
                    <motion.section key="captain" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                      <CaptainPanel room={room} vote={(candidate) => void roomAction({ action: "vote", candidate })} />
                    </motion.section>
                  ) : null}
                </AnimatePresence>
              </div>

              <aside className="grid content-start gap-4">
                <OnlineMembers members={onlineMembers} />
                <PinnedPanel message={pinned} />
                <CompetitionsPanel room={room} openModal={setModal} />
              </aside>
            </section>
          </>
        ) : null}
      </div>
      <MiniGameModal modal={modal} onClose={() => setModal(null)} />
    </main>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Trophy; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/55 p-3 backdrop-blur-md">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/42">{label}</p>
        <Icon size={15} className="text-[#18e3bd]" aria-hidden="true" />
      </div>
      <p className="mt-2 truncate text-lg font-black text-white">{value}</p>
    </div>
  );
}

function QuickActions({ openModal }: { openModal: (modal: Modal) => void }) {
  return (
    <section className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.045] p-4 sm:grid-cols-3">
      {[
        ["stocks", "Player Market", BarChart3],
        ["shootout", "Penalty Duel", Zap],
        ["xi", "Starting XI", Swords]
      ].map(([id, label, Icon]) => (
        <button key={id as string} className="group rounded-lg border border-white/10 bg-black/35 p-4 text-left transition hover:border-[#18e3bd]/40 hover:bg-[#18e3bd]/10" type="button" onClick={() => openModal(id as Modal)}>
          <Icon size={20} className="text-[#18e3bd]" aria-hidden="true" />
          <p className="mt-3 font-black text-white">{label as string}</p>
          <p className="mt-1 text-xs leading-5 text-white/48">Open module</p>
        </button>
      ))}
    </section>
  );
}

function ActivityPanel({ room }: { room: SquadRoom }) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Live activity</p>
      <div className="mt-4 grid gap-2">
        {room.liveActivity.map((item) => (
          <div key={item} className="rounded-lg border border-white/10 bg-black/35 p-3 text-sm font-bold text-white/68">{item}</div>
        ))}
      </div>
    </section>
  );
}

function ChatPanel({
  room,
  message,
  replyTo,
  attachment,
  typing,
  setMessage,
  setReplyTo,
  setTyping,
  setAttachment,
  sendMessage,
  react,
  tip
}: {
  room: SquadRoom;
  message: string;
  replyTo: SquadMessage | null;
  attachment: SquadMessage["attachment"];
  typing: boolean;
  setMessage: (value: string) => void;
  setReplyTo: (value: SquadMessage | null) => void;
  setTyping: (value: boolean) => void;
  setAttachment: (value: SquadMessage["attachment"]) => void;
  sendMessage: () => void;
  react: (messageId: string, emoji: string) => void;
  tip: (to: string) => void;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.045]">
      <div className="flex items-center justify-between border-b border-white/10 p-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Squad chat</p>
          <h2 className="mt-1 text-xl font-black text-white">Matchday room</h2>
        </div>
        {typing ? <span className="rounded-lg border border-[#18e3bd]/25 bg-[#18e3bd]/10 px-2 py-1 text-[11px] font-black text-[#80ffe2]">Typing</span> : null}
      </div>
      <div className="grid max-h-[34rem] gap-3 overflow-y-auto p-4">
        {room.messages.map((item) => (
          <motion.article key={item.id} className="rounded-lg border border-white/10 bg-black/35 p-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#18e3bd]">{short(item.author)}</p>
                <p className="mt-2 text-sm leading-6 text-white/76">{item.body}</p>
              </div>
              <button className="rounded-md border border-white/10 bg-white/[0.05] px-2 py-1 text-[11px] font-black text-white/60 hover:text-white" type="button" onClick={() => tip(item.author)}>
                Tip
              </button>
            </div>
            {item.attachment ? <img className="mt-3 max-h-52 rounded-lg object-cover" src={item.attachment.url} alt={item.attachment.label ?? ""} /> : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {["fire", "ball", "clap"].map((emoji) => (
                <button key={emoji} className="rounded-md border border-white/10 bg-white/[0.05] px-2 py-1 text-xs font-black text-white/58 hover:bg-white/10" type="button" onClick={() => react(item.id, emoji)}>
                  {emoji} {item.reactions[emoji] ?? 0}
                </button>
              ))}
              <button className="rounded-md border border-white/10 bg-white/[0.05] px-2 py-1 text-xs font-black text-white/58 hover:bg-white/10" type="button" onClick={() => setReplyTo(item)}>Reply</button>
            </div>
          </motion.article>
        ))}
        {!room.messages.length ? <p className="rounded-lg border border-white/10 bg-black/35 p-5 text-sm text-white/60">Start the squad chat. Messages, GIFs, tips, and reactions appear here.</p> : null}
      </div>
      <div className="border-t border-white/10 p-4">
        {replyTo ? <p className="mb-2 rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-xs text-white/58">Replying to {short(replyTo.author)} <button className="font-black text-white" type="button" onClick={() => setReplyTo(null)}>clear</button></p> : null}
        {attachment ? <p className="mb-2 rounded-lg border border-[#18e3bd]/25 bg-[#18e3bd]/10 px-3 py-2 text-xs font-bold text-[#80ffe2]">{attachment.type.toUpperCase()} attached</p> : null}
        <div className="flex gap-2">
          <input
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/35 px-3 py-3 text-sm font-bold text-white outline-none focus:border-[#18e3bd]/50"
            value={message}
            onChange={(event) => {
              setMessage(event.target.value);
              setTyping(Boolean(event.target.value));
            }}
            placeholder="Talk tactics, goals, and signals..."
          />
          <button className="grid h-12 w-12 place-items-center rounded-lg border border-white/10 bg-white/[0.06] text-white hover:bg-white/12" type="button" onClick={() => setAttachment({ type: "image", url: "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=900&q=80", label: "Football upload" })} aria-label="Upload image">
            <ImagePlus size={17} aria-hidden="true" />
          </button>
          <button className="grid h-12 w-12 place-items-center rounded-lg border border-white/10 bg-white/[0.06] text-white hover:bg-white/12" type="button" onClick={() => setAttachment({ type: "gif", url: gifPicks[Math.floor(Math.random() * gifPicks.length)], label: "Matchday GIF" })} aria-label="Send GIF">
            <Laugh size={17} aria-hidden="true" />
          </button>
          <button className="grid h-12 w-12 place-items-center rounded-lg bg-white text-black hover:bg-[#18e3bd]" type="button" onClick={() => void sendMessage()} aria-label="Send message">
            <Send size={17} aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}

function CaptainPanel({ room, vote }: { room: SquadRoom; vote: (candidate: string) => void }) {
  const candidates = room.members.length ? room.members : [{ address: room.squad.creator ?? "open", label: "Open captain", joinedAt: room.squad.createdAt, online: true }];
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Captain vote</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {candidates.map((member) => {
          const result = room.captainVotes.find((item) => item.candidate === member.address);
          return (
            <button key={member.address} className="rounded-lg border border-white/10 bg-black/35 p-4 text-left transition hover:border-[#18e3bd]/40 hover:bg-[#18e3bd]/10" type="button" onClick={() => vote(member.address)}>
              <Crown size={18} className="text-[#f5a524]" aria-hidden="true" />
              <p className="mt-2 font-black text-white">{member.label ?? short(member.address)}</p>
              <p className="mt-1 text-sm text-white/50">{result?.votes ?? 0} votes</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function OnlineMembers({ members }: { members: SquadRoom["members"] }) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Online members</p>
      <div className="mt-4 grid gap-2">
        {members.slice(0, 6).map((member) => (
          <div key={member.address} className="flex items-center justify-between rounded-lg border border-white/10 bg-black/35 px-3 py-2">
            <span className="font-black text-white">{member.label ?? short(member.address)}</span>
            <span className="h-2 w-2 rounded-full bg-[#18e3bd]" />
          </div>
        ))}
        {!members.length ? <p className="text-sm text-white/58">No online members yet.</p> : null}
      </div>
    </section>
  );
}

function PinnedPanel({ message }: { message: SquadMessage | null }) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Pinned message</p>
      <p className="mt-3 text-sm leading-6 text-white/64">{message?.body ?? "Pin a tactical note from chat."}</p>
    </section>
  );
}

function CompetitionsPanel({ room, openModal }: { room: SquadRoom; openModal: (modal: Modal) => void }) {
  const map: Record<string, Modal> = { stock: "stocks", shootout: "shootout", xi: "xi" };
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Active competitions</p>
      <div className="mt-4 grid gap-2">
        {room.competitions.map((item) => (
          <button key={item.id} className="rounded-lg border border-white/10 bg-black/35 p-3 text-left transition hover:bg-white/[0.07]" type="button" onClick={() => openModal(map[item.id])}>
            <p className="font-black text-white">{item.title}</p>
            <p className="mt-1 text-xs font-bold text-[#18e3bd]">{item.status}</p>
          </button>
        ))}
      </div>
    </section>
  );
}

function MiniGameModal({ modal, onClose }: { modal: Modal; onClose: () => void }) {
  return (
    <AnimatePresence>
      {modal ? (
        <motion.div className="fixed inset-0 z-[90] grid place-items-end bg-black/70 p-3 backdrop-blur-md sm:place-items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.section className="w-full max-w-3xl overflow-hidden rounded-lg border border-white/10 bg-[#070911] text-white shadow-2xl" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}>
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Squad module</p>
                <h2 className="mt-1 text-2xl font-black">{modal === "stocks" ? "Player Stock Market" : modal === "shootout" ? "Penalty Shootout" : "Starting XI Battles"}</h2>
              </div>
              <button className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/[0.06]" type="button" onClick={onClose} aria-label="Close module">
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="p-4">
              {modal === "stocks" ? <StockMarketModule /> : null}
              {modal === "shootout" ? <ShootoutModule /> : null}
              {modal === "xi" ? <StartingXiModule /> : null}
            </div>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function StockMarketModule() {
  const players = [
    ["Saka", "+12.4%", "Attack momentum"],
    ["Mbappe", "+9.1%", "Popularity spike"],
    ["Bellingham", "-2.8%", "Rotation risk"]
  ];
  return (
    <div className="grid gap-3">
      {players.map(([name, move, note], index) => (
        <motion.div key={name} className="grid gap-3 rounded-lg border border-white/10 bg-black/35 p-3 sm:grid-cols-[1fr_8rem]" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.06 }}>
          <div>
            <p className="font-black">{name}</p>
            <p className="text-sm text-white/52">{note}</p>
          </div>
          <p className={`text-right font-black ${move.startsWith("+") ? "text-[#18e3bd]" : "text-[#ff5c39]"}`}>{move}</p>
        </motion.div>
      ))}
    </div>
  );
}

function ShootoutModule() {
  const [target, setTarget] = useState("");
  return (
    <div className="grid gap-4">
      <div className="grid aspect-[16/9] place-items-end rounded-lg border border-white/10 bg-[radial-gradient(circle_at_50%_75%,rgba(24,227,189,0.22),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-4">
        <div className="grid w-full grid-cols-3 gap-2">
          {["Left", "Center", "Right"].map((item) => (
            <button key={item} className={`rounded-lg border px-3 py-5 text-sm font-black ${target === item ? "border-[#18e3bd] bg-[#18e3bd]/20" : "border-white/10 bg-black/35"}`} type="button" onClick={() => setTarget(item)}>{item}</button>
          ))}
        </div>
      </div>
      <p className="text-sm font-bold text-white/60">{target ? `Shot locked: ${target}. Streak board ready.` : "Choose shot direction."}</p>
    </div>
  );
}

function StartingXiModule() {
  const players = ["GK", "LB", "CB", "CB", "RB", "CM", "CM", "AM", "LW", "ST", "RW"];
  return (
    <div className="rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(24,227,189,0.16),rgba(66,165,255,0.06)),#07110d] p-4">
      <div className="grid aspect-[3/2] grid-cols-4 gap-3">
        {players.map((role, index) => (
          <motion.button key={`${role}-${index}`} className="rounded-lg border border-white/15 bg-black/35 text-xs font-black text-white shadow-lg" type="button" whileHover={{ scale: 1.04 }}>
            {role}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function short(value: string) {
  if (value.length < 12) {
    return value;
  }
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}
