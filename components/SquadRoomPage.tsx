"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  BarChart3,
  Camera,
  Crown,
  Gift,
  ImagePlus,
  Laugh,
  MessageCircle,
  Play,
  Search,
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
import { useEffect, useMemo, useRef, useState } from "react";
import { formatUnits } from "viem";
import { useAccount, useBalance, useConnect, useDisconnect } from "wagmi";
import type { SquadCompetition, SquadMessage, SquadRecord, SquadRoom } from "@/lib/squads";
import { clubsForSport, slotsForSport, type LineupSlot, type PlayerOption, type PlayerSport } from "@/lib/player-catalog";
import { xLayerTestnet } from "@/lib/arc";
import { pickWalletConnector } from "@/lib/wallet";
import { errorMessage } from "@/lib/utils";
import { KickoffLoader, TopHeader } from "@/components/XCupApp";

type Tab = "overview" | "chat" | "captain";
type Modal = "stocks" | "shootout" | "xi" | null;

const LOCAL_SQUADS_KEY = "xcup-local-squads";

const gifPicks = [
  { label: "Goal celebration", url: "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif", tags: "goal celebration football soccer win" },
  { label: "Big reaction", url: "https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/giphy.gif", tags: "reaction wow hype chat" },
  { label: "Matchday mood", url: "https://media.giphy.com/media/3o6Zt6ML6BklcajjsA/giphy.gif", tags: "matchday excited fans" },
  { label: "Trophy lift", url: "https://media.giphy.com/media/26BRFVywkb1lkbz1K/giphy.gif", tags: "trophy winner champions" },
  { label: "Pressure", url: "https://media.giphy.com/media/11sBLVxNs7v6WA/giphy.gif", tags: "pressure nervous intense" },
  { label: "Clean pass", url: "https://media.giphy.com/media/3o7aD2saalBwwftBIY/giphy.gif", tags: "pass skill football" },
  { label: "Clutch", url: "https://media.giphy.com/media/3ohhwfAa9rbXaZe86c/giphy.gif", tags: "clutch focus locked in" },
  { label: "Laugh", url: "https://media.giphy.com/media/10JhviFuU2gWD6/giphy.gif", tags: "laugh funny banter" },
  { label: "Applause", url: "https://media.giphy.com/media/nbvFVPiEiJH6JOGIok/giphy.gif", tags: "applause clap respect" },
  { label: "No way", url: "https://media.giphy.com/media/6nWhy3ulBL7GSCvKw6/giphy.gif", tags: "no way shock reaction" },
  { label: "Vamos", url: "https://media.giphy.com/media/3o6ZsYzuLyRfSGX4f6/giphy.gif", tags: "vamos celebrate win" },
  { label: "Defense", url: "https://media.giphy.com/media/5VKbvrjxpVJCM/giphy.gif", tags: "defense blocked surprised" }
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const localMessagesKey = `xcup-squad-chat-${id}`;
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
          setRoom((current) => {
            const localMessages = loadLocalMessages(localMessagesKey);
            const messages = mergeMessages(data.room.messages, localMessages);
            const nextRoom = { ...(current ?? data.room), ...data.room, messages };
            persistLocalSquad(nextRoom.squad);
            return nextRoom;
          });
          setStatus("");
        }
      } catch (error) {
        if (!cancelled) {
          const cachedSquad = loadLocalSquad(id);
          if (cachedSquad) {
            setRoom(localRoomFor(cachedSquad, loadLocalMessages(localMessagesKey)));
            setStatus("Showing saved squad room while shared sync reconnects.");
          } else {
            setStatus(error instanceof Error ? error.message : "Unable to load squad room.");
          }
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
  }, [id, localMessagesKey]);

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
    persistLocalSquad(data.room.squad);
    persistLocalMessages(localMessagesKey, data.room.messages);
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

  async function uploadImage(file: File) {
    if (!file.type.startsWith("image/")) {
      setStatus("Choose an image file.");
      return;
    }
    if (file.size > 1_400_000) {
      setStatus("Image is too large. Keep uploads under 1.4MB for the local chat cache.");
      return;
    }
    const url = await readFileAsDataUrl(file);
    setAttachment({ type: "image", url, label: file.name });
    setStatus("");
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
                        fileInputRef={fileInputRef}
                        uploadImage={uploadImage}
                        sendMessage={sendMessage}
                        react={(messageId, emoji) => void roomAction({ action: "reaction", messageId, emoji })}
                        tip={(to) => void roomAction({ action: "tip", to, amount: "5" })}
                      />
                    </motion.section>
                  ) : null}
                  {tab === "captain" ? (
                    <motion.section key="captain" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                      <CaptainPanel
                        room={room}
                        vote={(candidate) => void roomAction({ action: "vote", candidate })}
                        apply={(candidateName, statement) => void roomAction({ action: "applyCaptain", candidateName, statement })}
                      />
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
  fileInputRef,
  uploadImage,
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
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  uploadImage: (file: File) => void | Promise<void>;
  sendMessage: () => void;
  react: (messageId: string, emoji: string) => void;
  tip: (to: string) => void;
}) {
  const visibleMessages = room.messages.slice().reverse();
  const [gifOpen, setGifOpen] = useState(false);
  const [gifQuery, setGifQuery] = useState("");
  const filteredGifs = gifPicks.filter((gif) => `${gif.label} ${gif.tags}`.toLowerCase().includes(gifQuery.trim().toLowerCase()));

  return (
    <section className="flex min-h-[42rem] flex-col overflow-hidden rounded-lg border border-white/10 bg-white/[0.045]">
      <div className="flex items-center justify-between border-b border-white/10 p-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Squad chat</p>
          <h2 className="mt-1 text-xl font-black text-white">Matchday room</h2>
        </div>
        {typing ? <span className="rounded-lg border border-[#18e3bd]/25 bg-[#18e3bd]/10 px-2 py-1 text-[11px] font-black text-[#80ffe2]">Typing</span> : null}
      </div>
      <div className="grid min-h-[28rem] flex-1 content-start gap-3 overflow-y-auto p-4">
        {visibleMessages.map((item) => (
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
        {gifOpen ? (
          <div className="mb-3 rounded-lg border border-white/10 bg-[#070911] p-3 shadow-2xl">
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/45 px-3 py-2">
              <Search size={15} className="text-white/42" aria-hidden="true" />
              <input
                className="min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none placeholder:text-white/32"
                value={gifQuery}
                onChange={(event) => setGifQuery(event.target.value)}
                placeholder="Search GIFs"
              />
              <button className="text-xs font-black text-white/50 hover:text-white" type="button" onClick={() => setGifOpen(false)}>Close</button>
            </div>
            <div className="mt-3 grid max-h-72 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 md:grid-cols-4">
              {filteredGifs.map((gif) => (
                <button
                  key={gif.url}
                  className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] text-left transition hover:border-[#18e3bd]/50"
                  type="button"
                  onClick={() => {
                    setAttachment({ type: "gif", url: gif.url, label: gif.label });
                    setGifOpen(false);
                  }}
                >
                  <img className="h-24 w-full object-cover" src={gif.url} alt="" />
                  <span className="block truncate px-2 py-1.5 text-[11px] font-black text-white/68">{gif.label}</span>
                </button>
              ))}
              {!filteredGifs.length ? <p className="col-span-full rounded-lg border border-white/10 bg-black/35 p-3 text-sm text-white/58">No GIF matches. Try goal, laugh, trophy, pressure, or clutch.</p> : null}
            </div>
          </div>
        ) : null}
        <input
          ref={fileInputRef}
          className="hidden"
          type="file"
          accept="image/*"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void uploadImage(file);
            }
            event.target.value = "";
          }}
        />
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
          <button className="grid h-12 w-12 place-items-center rounded-lg border border-white/10 bg-white/[0.06] text-white hover:bg-white/12" type="button" onClick={() => fileInputRef.current?.click()} aria-label="Upload image">
            <ImagePlus size={17} aria-hidden="true" />
          </button>
          <button className="grid h-12 w-12 place-items-center rounded-lg border border-white/10 bg-white/[0.06] text-white hover:bg-white/12" type="button" onClick={() => setGifOpen((current) => !current)} aria-label="Choose GIF">
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

function CaptainPanel({
  room,
  vote,
  apply
}: {
  room: SquadRoom;
  vote: (candidate: string) => void;
  apply: (candidateName: string, statement: string) => void;
}) {
  const [voteName, setVoteName] = useState("");
  const [applicationName, setApplicationName] = useState("");
  const [statement, setStatement] = useState("");
  const rankedApplicants = room.captainApplicants
    .slice()
    .sort((a, b) => (b.elo ?? 0) - (a.elo ?? 0) || new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());

  return (
    <section className="grid gap-4 rounded-lg border border-white/10 bg-white/[0.045] p-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Captain vote</p>
        <h2 className="mt-1 text-2xl font-black text-white">Nominate a leader</h2>
        <div className="mt-4 grid gap-3 rounded-lg border border-white/10 bg-black/35 p-3">
          <label className="grid gap-2 text-sm font-bold text-white/58">
            Desired captain name
            <input className="rounded-lg border border-white/10 bg-black/40 px-3 py-3 text-base font-black text-white outline-none focus:border-[#18e3bd]/60" value={voteName} onChange={(event) => setVoteName(event.target.value)} placeholder="Enter captain name" />
          </label>
          <button className="flex w-fit items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-black text-black transition hover:bg-[#18e3bd] disabled:opacity-50" type="button" disabled={!voteName.trim()} onClick={() => {
            vote(voteName.trim());
            setVoteName("");
          }}>
            <Vote size={16} aria-hidden="true" />
            Vote
          </button>
        </div>
        <div className="mt-4 grid gap-2">
          {room.captainVotes.map((result) => (
            <div key={result.candidate} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/35 p-3">
              <div>
                <p className="font-black text-white">{result.candidate}</p>
                <p className="text-xs font-bold text-white/42">{result.voters.length} voter{result.voters.length === 1 ? "" : "s"}</p>
              </div>
              <span className="rounded-lg border border-[#18e3bd]/25 bg-[#18e3bd]/10 px-3 py-1 text-sm font-black text-[#80ffe2]">{result.votes}</span>
            </div>
          ))}
          {!room.captainVotes.length ? <p className="rounded-lg border border-white/10 bg-black/35 p-4 text-sm text-white/58">No captain votes yet.</p> : null}
        </div>
      </div>
      <div className="grid content-start gap-4">
        <div className="rounded-lg border border-white/10 bg-black/35 p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Apply for captain</p>
          <div className="mt-3 grid gap-3">
            <input className="rounded-lg border border-white/10 bg-black/40 px-3 py-3 text-sm font-bold text-white outline-none focus:border-[#18e3bd]/60" value={applicationName} onChange={(event) => setApplicationName(event.target.value)} placeholder="Your manager name" />
            <textarea className="min-h-24 resize-none rounded-lg border border-white/10 bg-black/40 px-3 py-3 text-sm font-bold text-white outline-none focus:border-[#18e3bd]/60" value={statement} onChange={(event) => setStatement(event.target.value)} placeholder="Why should the squad trust your captaincy?" />
            <button className="rounded-lg bg-white px-4 py-3 text-sm font-black text-black transition hover:bg-[#18e3bd] disabled:opacity-50" type="button" disabled={!applicationName.trim()} onClick={() => {
              apply(applicationName.trim(), statement.trim());
              setApplicationName("");
              setStatement("");
            }}>
              Submit application
            </button>
          </div>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/35 p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Applicant track record</p>
          <div className="mt-3 grid gap-2">
            {rankedApplicants.map((applicant) => (
              <div key={applicant.address} className="rounded-lg border border-white/10 bg-white/[0.045] p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-black text-white">{applicant.name}</p>
                  <span className="text-xs font-black text-[#18e3bd]">ELO {applicant.elo ?? "pending"}</span>
                </div>
                <p className="mt-1 text-xs leading-5 text-white/52">{applicant.statement || "No captain statement yet."}</p>
              </div>
            ))}
            {!rankedApplicants.length ? <p className="rounded-lg border border-white/10 bg-white/[0.045] p-4 text-sm text-white/58">No captain applications yet. Real records appear after users start competing.</p> : null}
          </div>
        </div>
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
          <motion.section className="max-h-[92dvh] w-full max-w-5xl overflow-y-auto rounded-lg border border-white/10 bg-[#070911] text-white shadow-2xl" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}>
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
  const directions = ["Left", "Center", "Right"] as const;
  const modes = ["Solo Practice", "1v1 Match", "Squad vs Squad", "Ranked Mode"] as const;
  const [mode, setMode] = useState<(typeof modes)[number]>("Solo Practice");
  const [phase, setPhase] = useState<"pre" | "power" | "timing" | "result">("pre");
  const [target, setTarget] = useState<(typeof directions)[number]>("Center");
  const [power, setPower] = useState(52);
  const [timing, setTiming] = useState(50);
  const [round, setRound] = useState(1);
  const [score, setScore] = useState({ player: 0, opponent: 0 });
  const [history, setHistory] = useState<string[]>([]);
  const [countdown, setCountdown] = useState(3);
  const [result, setResult] = useState("Choose mode and start the duel.");
  const [movingPower, setMovingPower] = useState(true);
  const [movingTiming, setMovingTiming] = useState(true);

  useEffect(() => {
    if (phase !== "power") return;
    const interval = window.setInterval(() => setPower((value) => (value >= 96 ? 18 : value + 7)), 80);
    return () => window.clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase !== "timing") return;
    const interval = window.setInterval(() => setTiming((value) => (value >= 96 ? 4 : value + 9)), 70);
    return () => window.clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase !== "pre") return;
    setCountdown(3);
    const interval = window.setInterval(() => setCountdown((value) => Math.max(0, value - 1)), 650);
    const timeout = window.setTimeout(() => {
      setPhase("power");
      setResult("Lock power.");
      setMovingPower(true);
      setMovingTiming(true);
    }, 2050);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [phase, round]);

  function lockPower() {
    setMovingPower(false);
    setPhase("timing");
    setResult("Lock timing.");
  }

  function lockTiming() {
    setMovingTiming(false);
    const keeper = directions[Math.floor(Math.random() * directions.length)];
    const accuracy = 100 - Math.abs(timing - 50) * 2;
    const overhit = power > 84 && accuracy < 52;
    const saved = keeper === target && accuracy < 86;
    const goal = !overhit && !saved;
    const note = overhit ? "Missed high from bad timing." : saved ? `Saved. Keeper went ${keeper}.` : `Goal. Keeper went ${keeper}.`;
    setScore((current) => ({ ...current, player: current.player + (goal ? 1 : 0) }));
    setHistory((current) => [`R${round}: ${target} / ${power} power / ${accuracy}% timing - ${goal ? "Goal" : "No goal"}`, ...current].slice(0, 8));
    setResult(note);
    setPhase("result");
  }

  function nextRound() {
    setRound((current) => current + 1);
    setScore((current) => ({ ...current, opponent: current.opponent + (Math.random() > 0.52 ? 1 : 0) }));
    setPhase("pre");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="grid gap-4">
        <div className="flex flex-wrap gap-2">
          {modes.map((item) => (
            <button key={item} className={`rounded-lg border px-3 py-2 text-xs font-black transition ${mode === item ? "border-white bg-white text-black" : "border-white/10 bg-white/[0.05] text-white/62 hover:bg-white/10 hover:text-white"}`} type="button" onClick={() => setMode(item)}>{item}</button>
          ))}
        </div>
        <div className="relative min-h-[24rem] overflow-hidden rounded-lg border border-white/10 bg-[radial-gradient(circle_at_50%_82%,rgba(24,227,189,0.22),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-4">
          <div className="absolute left-[12%] right-[12%] top-8 h-32 border-4 border-white/35 border-b-0" />
          <motion.div className="absolute bottom-16 h-5 w-5 rounded-full bg-white shadow-[0_0_22px_rgba(255,255,255,0.8)]" animate={{ left: target === "Left" ? "24%" : target === "Right" ? "72%" : "48%", y: phase === "result" ? -155 : 0 }} transition={{ type: "spring", stiffness: 90, damping: 14 }} />
          <motion.div className="absolute top-28 h-12 w-16 rounded-t-full border border-[#18e3bd]/35 bg-[#18e3bd]/25" animate={{ left: phase === "result" ? target === "Left" ? "18%" : target === "Right" ? "70%" : "46%" : "46%", rotate: phase === "result" ? target === "Left" ? -24 : target === "Right" ? 24 : 0 : 0 }} />
          <div className="absolute inset-x-4 bottom-4 grid grid-cols-3 gap-2">
            {directions.map((item) => (
              <button key={item} className={`rounded-lg border px-3 py-5 text-sm font-black ${target === item ? "border-[#18e3bd] bg-[#18e3bd]/20" : "border-white/10 bg-black/35"}`} type="button" onClick={() => setTarget(item)}>{item}</button>
            ))}
          </div>
          {phase === "pre" ? <div className="absolute inset-0 grid place-items-center bg-black/25 text-7xl font-black text-white">{countdown || "GO"}</div> : null}
        </div>
        <div className="grid gap-3 rounded-lg border border-white/10 bg-black/35 p-4">
          <Meter label="Power" value={power} active={phase === "power" && movingPower} />
          <Meter label="Timing" value={timing} active={phase === "timing" && movingTiming} />
          <div className="flex flex-wrap gap-2">
            <button className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-black text-black transition hover:bg-[#18e3bd] disabled:opacity-50" type="button" disabled={phase !== "power"} onClick={lockPower}>
              <Zap size={16} aria-hidden="true" />
              Lock power
            </button>
            <button className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-black text-black transition hover:bg-[#18e3bd] disabled:opacity-50" type="button" disabled={phase !== "timing"} onClick={lockTiming}>
              <Play size={16} aria-hidden="true" />
              Shoot
            </button>
            <button className="rounded-lg border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-black text-white transition hover:bg-white/12 disabled:opacity-50" type="button" disabled={phase !== "result"} onClick={nextRound}>
              Next round
            </button>
          </div>
        </div>
      </div>
      <aside className="grid content-start gap-3">
        <div className="rounded-lg border border-white/10 bg-black/35 p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">{mode}</p>
          <p className="mt-3 text-3xl font-black">{score.player} - {score.opponent}</p>
          <p className="mt-2 text-sm leading-6 text-white/60">Round {round} of 5. Ties continue into sudden death.</p>
          <p className="mt-3 rounded-lg border border-white/10 bg-white/[0.045] p-3 text-sm font-bold text-white/70">{result}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/35 p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Shot history</p>
          <div className="mt-3 grid gap-2">
            {history.map((item) => <p key={item} className="rounded-md bg-white/[0.05] p-2 text-xs font-bold text-white/58">{item}</p>)}
            {!history.length ? <p className="text-sm text-white/52">Shots appear here after the first round.</p> : null}
          </div>
        </div>
      </aside>
    </div>
  );
}

function StartingXiModule() {
  const [sport, setSport] = useState<PlayerSport>("football");
  const [activeSlot, setActiveSlot] = useState<LineupSlot>(slotsForSport("football")[0]);
  const [clubId, setClubId] = useState(clubsForSport("football")[0]?.id ?? "");
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [lineup, setLineup] = useState<Record<string, PlayerOption>>({});
  const slots = slotsForSport(sport);
  const clubs = clubsForSport(sport);
  const selectedXp = Object.values(lineup).reduce((total, player) => total + player.name.length * 6 + player.position.length * 10, 0);

  useEffect(() => {
    const nextSlots = slotsForSport(sport);
    const nextClubs = clubsForSport(sport);
    setActiveSlot(nextSlots[0]);
    setClubId(nextClubs[0]?.id ?? "");
    setLineup({});
  }, [sport]);

  useEffect(() => {
    let cancelled = false;
    async function loadPlayers() {
      setLoadingPlayers(true);
      try {
        const response = await fetch(`/api/players?sport=${sport}&club=${encodeURIComponent(clubId)}&position=${encodeURIComponent(activeSlot.position)}`, { cache: "no-store" });
        const data = (await response.json()) as { players: PlayerOption[] };
        if (!cancelled) setPlayers(data.players);
      } catch {
        if (!cancelled) setPlayers([]);
      } finally {
        if (!cancelled) setLoadingPlayers(false);
      }
    }
    if (clubId) void loadPlayers();
    return () => {
      cancelled = true;
    };
  }, [activeSlot.position, clubId, sport]);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(24,227,189,0.16),rgba(66,165,255,0.06)),#07110d] p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Manager mode</p>
            <h3 className="text-xl font-black text-white">Starting XI Battles</h3>
          </div>
          <div className="flex rounded-lg border border-white/10 bg-black/35 p-1">
            {(["football", "basketball"] as PlayerSport[]).map((item) => (
              <button key={item} className={`rounded-md px-3 py-2 text-xs font-black capitalize ${sport === item ? "bg-white text-black" : "text-white/58 hover:bg-white/10"}`} type="button" onClick={() => setSport(item)}>{item}</button>
            ))}
          </div>
        </div>
        <div className="relative aspect-[3/4] min-h-[32rem] overflow-hidden rounded-lg border border-white/10 bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.04)_0_1px,transparent_1px_84px),linear-gradient(180deg,rgba(24,227,189,0.18),rgba(2,7,6,0.95))]">
          <div className="absolute inset-x-[8%] top-[8%] h-[84%] rounded-[42%] border border-white/15" />
          {slots.map((slot) => {
            const pick = lineup[slot.id];
            return (
              <motion.button
                key={slot.id}
                className={`absolute grid min-h-16 w-24 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-lg border p-2 text-center text-xs font-black shadow-xl transition ${activeSlot.id === slot.id ? "border-[#18e3bd] bg-[#18e3bd]/20" : "border-white/15 bg-black/55 hover:bg-white/10"}`}
                style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
                type="button"
                whileHover={{ scale: 1.04 }}
                onClick={() => setActiveSlot(slot)}
              >
                {pick?.image ? <img className="h-8 w-8 rounded-full object-cover" src={pick.image} alt="" /> : null}
                <span className="line-clamp-2">{pick?.name ?? slot.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
      <aside className="grid content-start gap-3 rounded-lg border border-white/10 bg-black/35 p-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Select player</p>
          <p className="mt-1 text-lg font-black text-white">{activeSlot.label} slot</p>
        </div>
        <select className="rounded-lg border border-white/10 bg-black px-3 py-3 text-sm font-black text-white outline-none focus:border-[#18e3bd]/60" value={clubId} onChange={(event) => setClubId(event.target.value)}>
          {clubs.map((club) => <option key={club.id} value={club.id}>{club.name} - {club.league}</option>)}
        </select>
        <div className="grid max-h-[24rem] gap-2 overflow-y-auto pr-1">
          {loadingPlayers ? <p className="rounded-lg border border-white/10 bg-white/[0.045] p-3 text-sm text-white/58">Loading players...</p> : null}
          {!loadingPlayers && players.map((player) => (
            <button key={player.id} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.045] p-3 text-left transition hover:border-[#18e3bd]/40 hover:bg-[#18e3bd]/10" type="button" onClick={() => setLineup((current) => ({ ...current, [activeSlot.id]: player }))}>
              {player.image ? <img className="h-11 w-11 rounded-full object-cover" src={player.image} alt="" /> : <span className="grid h-11 w-11 place-items-center rounded-full bg-white/[0.08]"><Camera size={16} aria-hidden="true" /></span>}
              <span className="min-w-0">
                <span className="block truncate font-black text-white">{player.name}</span>
                <span className="block text-xs font-bold text-white/42">{player.position} - {player.club}</span>
              </span>
            </button>
          ))}
          {!loadingPlayers && !players.length ? <p className="rounded-lg border border-white/10 bg-white/[0.045] p-3 text-sm leading-6 text-white/58">No roster returned for this slot yet. Try another club or position.</p> : null}
        </div>
        <div className="rounded-lg border border-[#18e3bd]/25 bg-[#18e3bd]/10 p-3">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#80ffe2]">XP bar</p>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-black/50">
            <div className="h-full rounded-full bg-[#18e3bd]" style={{ width: `${Math.min(100, selectedXp / 35)}%` }} />
          </div>
          <p className="mt-2 text-sm font-black text-white">{selectedXp} manager XP</p>
        </div>
      </aside>
    </div>
  );
}

function Meter({ label, value, active }: { label: string; value: number; active: boolean }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs font-black uppercase tracking-[0.14em] text-white/48">
        <span>{label}</span>
        <span className={active ? "text-[#18e3bd]" : "text-white"}>{value}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-white/[0.08]">
        <motion.div className="h-full rounded-full bg-[#18e3bd]" animate={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function loadLocalMessages(key: string) {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as SquadMessage[]) : [];
  } catch {
    return [];
  }
}

function persistLocalMessages(key: string, messages: SquadMessage[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(messages.slice(0, 250)));
  } catch {
  }
}

function mergeMessages(remote: SquadMessage[], local: SquadMessage[]) {
  const seen = new Set<string>();
  return [...remote, ...local]
    .filter((message) => {
      if (seen.has(message.id)) return false;
      seen.add(message.id);
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function loadLocalSquad(id: string) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_SQUADS_KEY);
    const squads = raw ? (JSON.parse(raw) as SquadRecord[]) : [];
    return squads.find((squad) => squad.id === id) ?? null;
  } catch {
    return null;
  }
}

function persistLocalSquad(squad: SquadRecord) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(LOCAL_SQUADS_KEY);
    const squads = raw ? (JSON.parse(raw) as SquadRecord[]) : [];
    const next = [squad, ...squads.filter((item) => item.id !== squad.id)].slice(0, 80);
    window.localStorage.setItem(LOCAL_SQUADS_KEY, JSON.stringify(next));
  } catch {
  }
}

function localRoomFor(squad: SquadRecord, messages: SquadMessage[]): SquadRoom {
  return {
    squad,
    members: [],
    messages,
    captainApplicants: [],
    captainVotes: [],
    competitions: localCompetitions(squad.name),
    liveActivity: [
      messages[0]?.body ? `Latest saved chat: ${messages[0].body}` : "Saved squad room restored on this device.",
      "Shared sync is reconnecting.",
      `${squad.members} members on the saved roster.`
    ],
    ranking: 1000 + squad.members * 20 + messages.length * 5
  };
}

function localCompetitions(squadName: string): SquadCompetition[] {
  return [
    { id: "stock", title: "Player Stock Market", status: "Live window", summary: `${squadName} portfolio opens before kickoff.` },
    { id: "shootout", title: "Penalty Shootout", status: "Ranked", summary: "1v1 streaks and squad-vs-squad records." },
    { id: "xi", title: "Starting XI Battles", status: "Voting", summary: "Build, compare, and vote on tactical boards." }
  ];
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function short(value: string) {
  if (value.length < 12) {
    return value;
  }
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}
