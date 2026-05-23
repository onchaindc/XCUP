"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Brain,
  Bot,
  Crown,
  Gamepad2,
  Globe2,
  Landmark,
  Newspaper,
  Radio,
  ShieldCheck,
  Swords,
  Target,
  Trophy,
  Users,
  Wallet
} from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatUnits } from "viem";
import { useAccount, useBalance, useConnect, useDisconnect } from "wagmi";
import type { LiveSportEvent, SportsNewsItem } from "@/lib/sports";
import { xLayerTestnet } from "@/lib/arc";
import { useNetworkStatus } from "@/lib/use-network-status";
import { shortAddress } from "@/lib/utils";

const topNav = [
  { label: "Matches", href: "/markets", icon: Radio },
  { label: "Arena", href: "/", icon: Trophy },
  { label: "Markets", href: "/markets", icon: Activity },
  { label: "GameFi", href: "/gamefi", icon: Gamepad2 },
  { label: "Squads", href: "/#squads", icon: Users },
  { label: "Agent", href: "/#agent", icon: Bot }
];

const squadxSquads = [
  {
    name: "Lagos Ultras",
    motto: "Counter-press every market.",
    role: "Captain-led",
    level: 18,
    elo: 1842,
    treasury: "412 OKB",
    accuracy: "68%",
    territory: "West Africa",
    accent: "#18e3bd"
  },
  {
    name: "Catalan Signal",
    motto: "Possession models, ruthless timing.",
    role: "Strategist DAO",
    level: 21,
    elo: 1916,
    treasury: "588 OKB",
    accuracy: "72%",
    territory: "Iberia",
    accent: "#42a5ff"
  },
  {
    name: "North London War Room",
    motto: "Scout reports before sentiment moves.",
    role: "Analyst stack",
    level: 16,
    elo: 1764,
    treasury: "336 OKB",
    accuracy: "64%",
    territory: "UK",
    accent: "#f5a524"
  }
];

const squadWars = [
  { match: "Lagos Ultras vs Catalan Signal", prize: "Founder Badge", status: "Arming strategy" },
  { match: "North London War Room vs Samba Desk", prize: "Treasury boost", status: "Scout phase" },
  { match: "Madrid Block vs City Chain", prize: "Prestige XP", status: "Pending live fixture" }
];

const agentInsights = [
  "Public sentiment is overheating favorites; wait for live pressure before joining the crowd.",
  "Squads with balanced Captain, Analyst, and Scout roles convert 19% more prediction XP.",
  "Treasury-backed wars should activate only on high-confidence live feeds, not stale schedules."
];

export function XCupApp() {
  const [showLoader, setShowLoader] = useState(true);
  const [events, setEvents] = useState<LiveSportEvent[]>([]);
  const [news, setNews] = useState<SportsNewsItem[]>([]);
  const [loadingFeeds, setLoadingFeeds] = useState(true);
  const [refreshingFeeds, setRefreshingFeeds] = useState(false);
  const [feedError, setFeedError] = useState("");
  const feedHydratedRef = useRef(false);
  const { address, isConnected } = useAccount();
  const { connectors, connectAsync, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const network = useNetworkStatus();
  const { data: balance } = useBalance({
    address,
    chainId: xLayerTestnet.id,
    query: { enabled: Boolean(address) }
  });
  const liveEvents = events.filter((event) => event.status.state === "in");
  const featured = liveEvents[0] ?? null;
  const formattedBalance = balance ? `${Number(formatUnits(balance.value, balance.decimals)).toFixed(4)} ${balance.symbol}` : "0.0000 OKB";

  useEffect(() => {
    const timer = window.setTimeout(() => setShowLoader(false), 2200);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadFeeds() {
      if (feedHydratedRef.current) {
        setRefreshingFeeds(true);
      } else {
        setLoadingFeeds(true);
      }
      setFeedError("");
      try {
        const [sportsResponse, newsResponse] = await Promise.all([
          fetch("/api/sports/live", { cache: "no-store" }),
          fetch("/api/sports/news", { cache: "no-store" })
        ]);
        if (!sportsResponse.ok || !newsResponse.ok) {
          throw new Error("Live feed is temporarily unavailable.");
        }
        const sportsData = (await sportsResponse.json()) as { events: LiveSportEvent[] };
        const newsData = (await newsResponse.json()) as { items: SportsNewsItem[] };
        if (!cancelled) {
          setEvents(sportsData.events);
          setNews(newsData.items);
          feedHydratedRef.current = true;
        }
      } catch (error) {
        if (!cancelled) {
          setFeedError(error instanceof Error ? error.message : "Unable to load live sports data.");
        }
      } finally {
        if (!cancelled) {
          setLoadingFeeds(false);
          setRefreshingFeeds(false);
        }
      }
    }

    void loadFeeds();
    const interval = window.setInterval(() => void loadFeeds(), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const stats = useMemo(
    () => [
      { label: "Live Events", value: String(liveEvents.length), icon: Radio },
      { label: "Tracked Games", value: String(events.length), icon: Globe2 },
      { label: "Headlines", value: String(news.length), icon: Newspaper },
      { label: "X Layer", value: isConnected && network.onArc ? "Ready" : "Testnet", icon: ShieldCheck }
    ],
    [events.length, isConnected, liveEvents.length, network.onArc, news.length]
  );

  async function connectWallet() {
    const connector = connectors[0];
    if (!connector) {
      return;
    }
    await connectAsync({ connector, chainId: xLayerTestnet.id });
  }

  return (
    <main className="x-cup-bg min-h-[100dvh] overflow-x-clip text-white">
      <AnimatePresence>{showLoader ? <KickoffLoader onSkip={() => setShowLoader(false)} /> : null}</AnimatePresence>
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[92rem] flex-col px-4 pb-8 pt-4 sm:px-6 lg:px-8">
        <TopHeader
          address={address}
          isConnected={isConnected}
          isPending={isPending}
          balance={formattedBalance}
          onConnect={() => void connectWallet()}
          onDisconnect={() => disconnect()}
        />
          <Hero
            featured={featured}
            stats={stats}
            loading={loadingFeeds}
            feedError={feedError}
            liveCount={liveEvents.length}
            news={news}
            refreshing={refreshingFeeds}
          />
        <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_25rem]">
          <div className="grid gap-4">
            <LiveBoard events={liveEvents} loading={loadingFeeds} refreshing={refreshingFeeds} />
            <SquadSection />
          </div>
          <aside className="grid content-start gap-4">
            <Headlines news={news} loading={loadingFeeds} refreshing={refreshingFeeds} />
            <AgentPanel featured={featured} />
          </aside>
        </section>
      </div>
    </main>
  );
}

export function TopHeader({
  address,
  isConnected,
  isPending,
  balance,
  onConnect,
  onDisconnect
}: {
  address?: `0x${string}`;
  isConnected: boolean;
  isPending: boolean;
  balance: string;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  return (
    <header className="sticky top-0 z-50 mb-4 border-b border-white/10 bg-[#030409]/90 py-3 backdrop-blur-xl">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <Link className="flex min-w-0 items-center gap-3" href="/">
          <XLayerMark className="h-9 w-9 shrink-0" />
          <span className="min-w-0">
            <span className="block truncate text-base font-black text-white">SquadX</span>
            <span className="block truncate text-[11px] font-bold uppercase tracking-[0.22em] text-white/42">World Cup on X Layer</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] p-1 lg:flex">
          {topNav.map((item) => (
            <Link key={item.label} className="flex min-h-10 items-center gap-2 rounded-md px-3 text-xs font-black text-white/62 transition hover:bg-white/10 hover:text-white" href={item.href}>
              <item.icon size={15} aria-hidden="true" />
              {item.label}
            </Link>
          ))}
        </nav>
        {isConnected ? (
          <button className="flex max-w-[11.5rem] items-center gap-2 rounded-lg border border-white/12 bg-white/[0.07] px-3 py-2 text-left text-xs font-bold text-white transition hover:bg-white/12" type="button" onClick={onDisconnect}>
            <Wallet size={16} aria-hidden="true" />
            <span className="min-w-0">
              <span className="block truncate">{shortAddress(address)}</span>
              <span className="block truncate text-[11px] text-white/50">{balance}</span>
            </span>
          </button>
        ) : (
          <button className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-black text-black transition hover:bg-[#18e3bd]" type="button" onClick={onConnect} disabled={isPending}>
            <Wallet size={16} aria-hidden="true" />
            {isPending ? "Connecting" : "Connect"}
          </button>
        )}
      </div>
      <nav className="mt-3 grid grid-cols-3 gap-1 rounded-lg border border-white/10 bg-white/[0.04] p-1 sm:grid-cols-6 lg:hidden">
        {topNav.map((item) => (
          <Link key={item.label} className="flex min-h-10 items-center justify-center gap-1 rounded-md px-1 text-[11px] font-black text-white/62 transition hover:bg-white/10 hover:text-white" href={item.href}>
            <item.icon size={14} aria-hidden="true" />
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function KickoffLoader({ onSkip }: { onSkip: () => void }) {
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
        <div className="x-loader-title">
          <span>SquadX</span>
          <strong>Loading live matchday</strong>
        </div>
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

function Hero({
  featured,
  stats,
  loading,
  feedError,
  liveCount,
  news,
  refreshing
}: {
  featured: LiveSportEvent | null;
  stats: Array<{ label: string; value: string; icon: typeof Radio }>;
  loading: boolean;
  feedError: string;
  liveCount: number;
  news: SportsNewsItem[];
  refreshing: boolean;
}) {
  const leadNews = news[0];
  return (
    <section className="relative overflow-hidden rounded-lg border border-white/10 bg-black">
      <div className="absolute inset-0 opacity-90">
        <div className="x-reference-grid" />
        <div className="x-reference-ribbon x-reference-ribbon-one x-motion-drift" />
        <div className="x-reference-ribbon x-reference-ribbon-two x-motion-drift-slow" />
        <div className="x-reference-ribbon x-reference-ribbon-three" />
        <div className="x-reference-ball x-motion-ball" />
      </div>
      <div className="relative z-10 grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-h-[25rem] flex-col justify-between">
          <div>
            <p className="text-2xl font-light tracking-normal text-white sm:text-3xl">SquadX</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/62">
              AI-powered squad warfare, live football predictions, and onchain reputation built for X Layer.
            </p>
          </div>
          <div>
            <div className="mb-4 flex flex-wrap gap-2">
              {["Live markets", "Fantasy lineups", "Fan squads", "AI signals"].map((item) => (
                <span key={item} className="rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs font-bold text-white/70">
                  {item}
                </span>
              ))}
            </div>
            <h1 className="max-w-3xl text-4xl font-black leading-[1.02] tracking-normal text-white sm:text-5xl lg:text-6xl">
              Build your squad. Conquer the World Cup.
            </h1>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-black text-black transition hover:bg-[#18e3bd]" href="/markets">
                Open Markets
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link className="flex items-center gap-2 rounded-lg border border-white/12 bg-white/[0.06] px-3 py-2 text-sm font-black text-white transition hover:bg-white/12" href="/gamefi">
                Play GameFi
                <Gamepad2 size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
        <div className="grid content-end gap-3">
          <div className="rounded-lg border border-white/10 bg-black/55 p-4 backdrop-blur-md">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">
              {refreshing ? "Refreshing live feed" : liveCount ? "Live now" : loading ? "Syncing feeds" : "Next top event"}
            </p>
            <p className="mt-3 text-xl font-black text-white">{featured ? featured.shortName : feedError || leadNews?.title || "No live event available right now"}</p>
            <p className="mt-2 text-sm leading-6 text-white/58">
              {featured ? `${featured.league} - ${featured.status.detail}` : leadNews ? "Latest football headline while live markets wait for the next real event." : "Markets only open when a real sports feed returns live events."}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {stats.map((stat) => (
              <motion.div
                key={stat.label}
                className="rounded-lg border border-white/10 bg-black/55 p-3 backdrop-blur-md"
                animate={{ opacity: [0.75, 1, 0.75] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/42">{stat.label}</p>
                  <stat.icon size={14} className="text-[#18e3bd]" aria-hidden="true" />
                </div>
                <p className="mt-2 truncate text-lg font-black text-white">{stat.value}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function LiveBoard({ events, loading, refreshing }: { events: LiveSportEvent[]; loading: boolean; refreshing: boolean }) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Top Board</p>
          <h2 className="mt-1 text-2xl font-black text-white">Priority games</h2>
        </div>
        <div className="flex items-center gap-2">
          {refreshing ? <span className="rounded-lg border border-[#18e3bd]/20 bg-[#18e3bd]/10 px-2 py-1 text-[11px] font-black uppercase text-[#80ffe2]">Syncing</span> : null}
          <Link className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-black text-white transition hover:bg-white/12" href="/markets">
            All markets
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {loading && !events.length ? <SkeletonCards count={4} /> : null}
        {!loading && events.length ? events.slice(0, 6).map((event) => <EventMiniCard key={event.id} event={event} />) : null}
        {!loading && !events.length ? (
          <div className="rounded-lg border border-white/10 bg-black/35 p-5 text-sm text-white/62 md:col-span-2">
            No live sports events are available from the feed right now. The app will refresh automatically.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function EventMiniCard({ event }: { event: LiveSportEvent }) {
  const isLive = event.status.state === "in";
  return (
    <article className="rounded-lg border border-white/10 bg-black/35 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white/42">{event.league}</p>
          <h3 className="mt-2 text-lg font-black text-white">{event.shortName}</h3>
        </div>
        <span className={`rounded-lg border px-2 py-1 text-[11px] font-black uppercase ${isLive ? "border-[#18e3bd]/30 bg-[#18e3bd]/10 text-[#80ffe2]" : "border-white/10 bg-white/[0.06] text-white/60"}`}>
          {isLive ? "Live" : event.status.state}
        </span>
      </div>
      <p className="mt-3 text-sm text-white/58">{event.status.detail}</p>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm font-black text-white">
        <span className="rounded-md bg-white/[0.06] p-2">{event.awayTeam.shortName} {event.awayTeam.score ?? ""}</span>
        <span className="rounded-md bg-white/[0.06] p-2">{event.homeTeam.shortName} {event.homeTeam.score ?? ""}</span>
      </div>
    </article>
  );
}

function Headlines({ news, loading, refreshing }: { news: SportsNewsItem[]; loading: boolean; refreshing: boolean }) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Live Headlines</p>
          <h2 className="mt-1 text-xl font-black text-white">Football first</h2>
        </div>
        {refreshing ? <Radio size={16} className="animate-pulse text-[#18e3bd]" aria-hidden="true" /> : null}
      </div>
      <div className="mt-4 grid gap-3">
        {loading && !news.length ? <SkeletonCards count={3} /> : null}
        {!loading && news.slice(0, 5).map((item) => (
          <a key={item.id} className="block rounded-lg border border-white/10 bg-black/35 p-3 transition hover:bg-white/[0.07]" href={item.link} target="_blank" rel="noreferrer">
            <p className="text-sm font-black leading-5 text-white">{item.title}</p>
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/52">{item.description}</p>
          </a>
        ))}
      </div>
    </section>
  );
}

function AgentPanel({ featured }: { featured: LiveSportEvent | null }) {
  return (
    <section id="agent" className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.045] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">AI Analyst</p>
          <h2 className="mt-1 text-xl font-black text-white">Squad strategist</h2>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-lg border border-[#18e3bd]/25 bg-[#18e3bd]/10 text-[#80ffe2]">
          <Brain size={20} aria-hidden="true" />
        </span>
      </div>
      <div className="mt-4 rounded-lg border border-white/10 bg-black/35 p-3">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-white/38">Current read</p>
        <p className="mt-2 text-sm leading-6 text-white/70">
          {featured
            ? `${featured.shortName}: live pressure is active. AI recommends squad-weighted prediction sizing, not solo chasing.`
            : "Waiting for a verified live fixture before generating tactical prediction suggestions."}
        </p>
      </div>
      <div className="mt-3 grid gap-2">
        {agentInsights.map((insight, index) => (
          <motion.div
            key={insight}
            className="rounded-lg border border-white/10 bg-black/25 p-3 text-sm leading-6 text-white/62"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
          >
            {insight}
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function SquadSection() {
  return (
    <section id="squads" className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.045]">
      <div className="relative p-4 sm:p-5">
        <div className="absolute inset-0 opacity-70">
          <div className="x-squad-grid" />
        </div>
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">SquadX Core</p>
            <h2 className="mt-2 max-w-2xl text-3xl font-black tracking-normal text-white sm:text-4xl">Football tribal strategy economies onchain.</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/62">
              Create squads, assign roles, pool strategy, climb ELO, fund treasuries, and fight World Cup squad wars on X Layer.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <SquadMetric label="Squads" value="128" icon={Users} />
            <SquadMetric label="Wars" value="18" icon={Swords} />
            <SquadMetric label="Treasury" value="9.4K OKB" icon={Landmark} />
          </div>
        </div>
        <div className="relative z-10 mt-5 grid gap-3 lg:grid-cols-3">
          {squadxSquads.map((squad, index) => (
            <motion.article
              key={squad.name}
              className="group rounded-lg border border-white/10 bg-black/45 p-4 shadow-soft transition hover:-translate-y-1 hover:border-[#18e3bd]/35"
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ delay: index * 0.06 }}
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
                <SquadStat label="Level" value={String(squad.level)} />
                <SquadStat label="ELO" value={String(squad.elo)} />
                <SquadStat label="Accuracy" value={squad.accuracy} />
                <SquadStat label="Treasury" value={squad.treasury} />
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.045] p-3">
                <span className="text-xs font-black uppercase tracking-[0.14em] text-white/38">Territory</span>
                <span className="text-sm font-black text-[#18e3bd]">{squad.territory}</span>
              </div>
            </motion.article>
          ))}
        </div>
        <div className="relative z-10 mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="rounded-lg border border-white/10 bg-black/35 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Squad Wars</p>
                <h3 className="mt-1 text-xl font-black text-white">Live rivalry board</h3>
              </div>
              <Target size={22} className="text-[#f5a524]" aria-hidden="true" />
            </div>
            <div className="mt-4 grid gap-2">
              {squadWars.map((war) => (
                <div key={war.match} className="grid gap-2 rounded-lg border border-white/10 bg-white/[0.045] p-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
                  <div>
                    <p className="font-black text-white">{war.match}</p>
                    <p className="mt-1 text-xs font-bold text-white/42">{war.status}</p>
                  </div>
                  <p className="text-sm font-black text-[#18e3bd] sm:text-right">{war.prize}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/35 p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Onchain Loop</p>
            <div className="mt-4 grid gap-3">
              {[
                ["Join", "Wallet signs squad membership"],
                ["Predict", "Live picks update squad score"],
                ["War", "Treasury-backed rivalry events"],
                ["Evolve", "Dynamic badges track reputation"]
              ].map(([label, body]) => (
                <div key={label} className="flex gap-3">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#18e3bd] shadow-[0_0_18px_rgba(24,227,189,0.8)]" />
                  <p className="text-sm leading-6 text-white/62"><b className="text-white">{label}</b> - {body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SquadMetric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Users }) {
  return (
    <div className="min-w-[5.75rem] rounded-lg border border-white/10 bg-black/35 p-3">
      <Icon className="mx-auto text-[#18e3bd]" size={16} aria-hidden="true" />
      <p className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-white/40">{label}</p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  );
}

function SquadStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.045] p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-white/38">{label}</p>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  );
}

export function XLayerMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" role="img" aria-label="X Layer">
      <rect width="8" height="8" x="4" y="4" fill="currentColor" />
      <rect width="8" height="8" x="16" y="4" fill="currentColor" opacity="0.72" />
      <rect width="8" height="8" x="4" y="16" fill="currentColor" opacity="0.72" />
      <rect width="8" height="8" x="28" y="4" fill="currentColor" opacity="0.42" />
      <rect width="8" height="8" x="16" y="16" fill="currentColor" />
      <g aria-hidden="true" fill="#f5a524">
        <path d="M19 13h2v2h4v2.2c0 2-1.3 3.7-3.1 4.2A3.7 3.7 0 0 1 21 23v2h3v2h-8v-2h3v-2c-.4-.4-.7-.9-.9-1.6A4.4 4.4 0 0 1 15 17.2V15h4v-2Zm-2 4v.2c0 .9.5 1.7 1.2 2.1V17H17Zm4.8 2.3c.7-.4 1.2-1.2 1.2-2.1V17h-1.2v2.3Z" />
      </g>
      <rect width="8" height="8" x="28" y="16" fill="currentColor" opacity="0.72" />
      <rect width="8" height="8" x="4" y="28" fill="currentColor" opacity="0.42" />
      <rect width="8" height="8" x="16" y="28" fill="currentColor" opacity="0.72" />
    </svg>
  );
}

function SkeletonCards({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="h-32 animate-pulse rounded-lg border border-white/10 bg-white/[0.045]" />
      ))}
    </>
  );
}
