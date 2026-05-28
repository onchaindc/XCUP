"use client";

import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Bell,
  Brain,
  CalendarClock,
  Bot,
  CloudSun,
  CircleDot,
  Flag,
  Gamepad2,
  Globe2,
  ListChecks,
  Loader2,
  Newspaper,
  Radio,
  Settings2,
  ShieldCheck,
  Trophy,
  UserRound,
  Users,
  Wallet
} from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatUnits } from "viem";
import { useAccount, useBalance, useConnect, useDisconnect } from "wagmi";
import { eventStatusLabel, formatEventTime, formatLiveEventMatchup, type LiveMatchDetails, type LiveMatchPlayerEvent, type LiveSportEvent, type SportsNewsItem } from "@/lib/sports";
import { xLayerTestnet } from "@/lib/arc";
import type { Preferences, UserProfile } from "@/lib/app-store";
import { useAppStore } from "@/lib/app-store";
import { applyTheme } from "@/lib/theme";
import { useNetworkStatus } from "@/lib/use-network-status";
import { errorMessage, shortAddress } from "@/lib/utils";
import { pickWalletConnector } from "@/lib/wallet";

const topNav = [
  { label: "Matches", href: "/markets", icon: Radio },
  { label: "Arena", href: "/arena", icon: Trophy },
  { label: "Markets", href: "/markets", icon: Activity },
  { label: "GameFi", href: "/gamefi", icon: Gamepad2 },
  { label: "Squads", href: "/squads", icon: Users },
  { label: "Agent", href: "/agent", icon: Bot }
];

const agentInsights = [
  "Public sentiment is overheating favorites; wait for live pressure before joining the crowd.",
  "Best prediction windows open when score movement, clock state, and liquidity all agree.",
  "Onchain actions should use verified live feeds and clear settlement rules before wallet confirmation."
];

export function XCupApp() {
  const [events, setEvents] = useState<LiveSportEvent[]>([]);
  const [news, setNews] = useState<SportsNewsItem[]>([]);
  const [loadingFeeds, setLoadingFeeds] = useState(true);
  const [refreshingFeeds, setRefreshingFeeds] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [matchDetails, setMatchDetails] = useState<LiveMatchDetails | null>(null);
  const [loadingMatchDetails, setLoadingMatchDetails] = useState(false);
  const [feedError, setFeedError] = useState("");
  const [walletError, setWalletError] = useState("");
  const feedHydratedRef = useRef(false);
  const profile = useAppStore((state) => state.profile);
  const preferences = useAppStore((state) => state.preferences);
  const activities = useAppStore((state) => state.activities);
  const updateProfile = useAppStore((state) => state.updateProfile);
  const updatePreferences = useAppStore((state) => state.updatePreferences);
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
  const featured = liveEvents[0] ?? events[0] ?? null;
  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? featured;
  const formattedBalance = balance ? `${Number(formatUnits(balance.value, balance.decimals)).toFixed(4)} ${balance.symbol}` : "0.0000 OKB";

  useEffect(() => {
    applyTheme(preferences.theme);
  }, [preferences.theme]);

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

  useEffect(() => {
    if (!selectedEvent || selectedEvent.status.state !== "in") {
      setMatchDetails(null);
      setLoadingMatchDetails(false);
      return;
    }

    let cancelled = false;
    async function loadMatchDetails() {
      setLoadingMatchDetails(true);
      try {
        const response = await fetch(`/api/sports/live/details?id=${encodeURIComponent(selectedEvent.id)}`, { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Match detail feed is temporarily unavailable.");
        }
        const data = (await response.json()) as LiveMatchDetails;
        if (!cancelled) {
          setMatchDetails(data);
        }
      } catch {
        if (!cancelled) {
          setMatchDetails({
            id: selectedEvent.id,
            generatedAt: new Date().toISOString(),
            source: "Live match feed",
            available: false,
            message: "Detailed live stats could not be loaded for this match yet.",
            headlineStats: [],
            teamStats: [],
            goals: [],
            cards: [],
            substitutions: [],
            lineups: []
          });
        }
      } finally {
        if (!cancelled) {
          setLoadingMatchDetails(false);
        }
      }
    }

    void loadMatchDetails();
    const interval = window.setInterval(() => void loadMatchDetails(), 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [selectedEvent]);

  const stats = useMemo(
    () => [
      { label: "Live matches", value: String(liveEvents.length), icon: Radio },
      { label: "Matches", value: String(events.length), icon: Globe2 },
      { label: "Headlines", value: String(news.length), icon: Newspaper },
      { label: "X Layer", value: isConnected && network.onArc ? "Ready" : "Mainnet", icon: ShieldCheck }
    ],
    [events.length, isConnected, liveEvents.length, network.onArc, news.length]
  );

  const displayedMatchDetails = matchDetails?.id === selectedEvent?.id ? matchDetails : null;

  const notifications = useMemo(() => {
    const items = [
      {
        title: refreshingFeeds ? "Live feed refreshing" : "Live feed online",
        detail: `${events.length} fixtures tracked, ${liveEvents.length} live right now.`,
        tone: liveEvents.length ? "live" : "neutral"
      },
      {
        title: selectedEvent ? formatLiveEventMatchup(selectedEvent) : "Match center ready",
        detail: selectedEvent?.status.state === "in" ? "Live stats are syncing every 30 seconds." : "Full stats unlock when the fixture is live.",
        tone: selectedEvent?.status.state === "in" ? "live" : "neutral"
      },
      {
        title: network.onArc ? "Wallet on X Layer" : "X Layer mainnet",
        detail: isConnected ? "Wallet connected for arena actions." : "Connect wallet for predictions and squad actions.",
        tone: network.onArc ? "live" : "neutral"
      },
      ...activities.slice(0, 3).map((activity) => ({
        title: activity.title,
        detail: activity.detail,
        tone: activity.status === "failed" ? "danger" : "neutral"
      }))
    ];
    return items.slice(0, 6);
  }, [activities, events.length, isConnected, liveEvents.length, network.onArc, refreshingFeeds, selectedEvent]);

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

  return (
    <main className="x-cup-bg min-h-[100dvh] overflow-x-clip text-white">
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
            <LiveBoard events={events} loading={loadingFeeds} refreshing={refreshingFeeds} selectedEventId={selectedEvent?.id ?? ""} onSelect={setSelectedEventId} />
            <MatchDetailsPanel event={selectedEvent} details={displayedMatchDetails} loading={loadingMatchDetails && selectedEvent?.status.state === "in"} />
          </div>
          <aside className="grid content-start gap-4">
            <LiveNotifications items={notifications} />
            <ProfileSettingsPanel
              profile={profile}
              preferences={preferences}
              onUpdateProfile={updateProfile}
              onUpdatePreferences={updatePreferences}
            />
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
  const network = useNetworkStatus();
  const preferences = useAppStore((state) => state.preferences);
  const updatePreferences = useAppStore((state) => state.updatePreferences);
  const addRpcLabel = network.busy === "adding" ? "Adding" : "Add RPC";
  const switchLabel = network.busy === "switching" ? "Switching" : "Switch";

  return (
    <header className="sticky top-0 z-50 mb-4 rounded-lg border border-white/12 bg-[#050816]/86 px-3 py-3 shadow-[0_1rem_2.5rem_rgba(0,0,0,0.22)] backdrop-blur-xl">
      <div className="flex min-w-0 items-center justify-between gap-2 sm:gap-3">
        <Link className="flex min-w-0 items-center gap-3" href="/">
          <XLayerMark className="h-10 w-10 shrink-0 text-[#20f0c8]" />
          <span className="min-w-0">
            <span className="block truncate text-base font-black text-white">X Cup Arena</span>
            <span className="block truncate text-[11px] font-bold uppercase tracking-[0.22em] text-[#ffd23f]">World Cup on X Layer</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 rounded-lg border border-white/12 bg-white/[0.06] p-1 xl:flex">
          {topNav.map((item) => (
            <Link key={item.label} className="flex min-h-10 items-center gap-2 rounded-md px-3 text-xs font-black text-white/68 transition hover:bg-[#20f0c8]/12 hover:text-white" href={item.href}>
              <item.icon size={15} aria-hidden="true" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <button
            className="grid h-10 min-w-10 place-items-center rounded-lg border border-white/12 bg-white/[0.06] px-2 text-xs font-black text-white/76 transition hover:bg-white/12 hover:text-white sm:flex sm:gap-2 sm:px-3"
            type="button"
            onClick={() => updatePreferences({ theme: preferences.theme === "light" ? "dark" : "light" })}
            title={preferences.theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            aria-label="Toggle light mode"
          >
            <CloudSun size={16} aria-hidden="true" />
            <span className="hidden sm:inline">{preferences.theme === "light" ? "Dark" : "Light"}</span>
          </button>
          {network.wrongNetwork ? (
            <button
              className="hidden min-h-10 items-center gap-2 rounded-lg border border-[#ff4f3d]/30 bg-[#ff4f3d]/14 px-3 py-2 text-xs font-black text-[#ffc4ba] transition hover:bg-[#ff4f3d]/20 sm:flex"
              type="button"
              onClick={() => void network.switchNetwork()}
              disabled={network.syncing}
              title="Switch wallet to X Layer mainnet"
            >
              <ShieldCheck size={15} aria-hidden="true" />
              {switchLabel}
            </button>
          ) : null}
          <button
            className="grid h-10 min-w-10 place-items-center rounded-lg border border-white/12 bg-white/[0.06] px-2 text-xs font-black text-white/76 transition hover:bg-white/12 hover:text-white sm:flex sm:gap-2 sm:px-3"
            type="button"
            onClick={() => void network.addNetwork()}
            disabled={network.syncing}
            title="Add X Layer mainnet RPC to wallet"
            aria-label="Add X Layer mainnet RPC"
          >
            <ShieldCheck size={16} aria-hidden="true" />
            <span className="hidden sm:inline">{addRpcLabel}</span>
          </button>
          <Link className="grid h-10 w-10 place-items-center rounded-lg border border-white/12 bg-white/[0.06] text-white/76 transition hover:bg-white/12 hover:text-white" href="/profile" aria-label="Profile">
            <UserRound size={16} aria-hidden="true" />
          </Link>
          <Link className="grid h-10 w-10 place-items-center rounded-lg border border-white/12 bg-white/[0.06] text-white/76 transition hover:bg-white/12 hover:text-white" href="/profile?tab=settings" aria-label="Settings">
            <Settings2 size={16} aria-hidden="true" />
          </Link>
          {isConnected ? (
            <button className="flex max-w-[11.5rem] items-center gap-2 rounded-lg border border-[#20f0c8]/24 bg-[#20f0c8]/10 px-3 py-2 text-left text-xs font-bold text-white transition hover:bg-[#20f0c8]/16" type="button" onClick={onDisconnect}>
              <Wallet size={16} aria-hidden="true" />
              <span className="min-w-0">
                <span className="block truncate">{shortAddress(address)}</span>
                <span className="block truncate text-[11px] text-white/50">{balance}</span>
              </span>
            </button>
          ) : (
            <button className="flex items-center gap-2 rounded-lg bg-[#ffd23f] px-3 py-2 text-xs font-black text-[#151924] transition hover:bg-[#20f0c8]" type="button" onClick={onConnect} disabled={isPending}>
              <Wallet size={16} aria-hidden="true" />
              {isPending ? "Connecting" : "Connect"}
            </button>
          )}
        </div>
      </div>
      {network.networkError ? <p className="mt-2 rounded-lg border border-[#ff5c39]/25 bg-[#ff5c39]/10 px-3 py-2 text-xs font-bold text-[#ffb09d]">{network.networkError}</p> : null}
      {network.networkNotice ? <p className="mt-2 rounded-lg border border-[#18e3bd]/25 bg-[#18e3bd]/10 px-3 py-2 text-xs font-bold text-[#80ffe2]">{network.networkNotice}</p> : null}
      <nav className="mt-3 grid grid-cols-3 gap-1 rounded-lg border border-white/12 bg-white/[0.06] p-1 sm:grid-cols-6 xl:hidden">
        {topNav.map((item) => (
          <Link key={item.label} className="flex min-h-10 items-center justify-center gap-1 rounded-md px-1 text-[11px] font-black text-white/68 transition hover:bg-[#20f0c8]/12 hover:text-white" href={item.href}>
            <item.icon size={14} aria-hidden="true" />
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function KickoffLoader({ onSkip: _onSkip }: { onSkip: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-[80] grid place-items-center bg-black"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.55 }}
      aria-label="Loading X Cup arena"
    >
      <div className="x-loader-scene" aria-hidden="true">
        <div className="x-loader-title">
          <span>X Cup Arena</span>
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
    <section className="x-hero-poster relative overflow-hidden rounded-lg border border-white/15 bg-black shadow-[0_2rem_5rem_rgba(0,0,0,0.4)]">
      <div className="absolute inset-0 opacity-90">
        <div className="x-reference-grid" />
        <div className="x-poster-rings" />
        <div className="x-reference-ribbon x-reference-ribbon-one x-motion-drift" />
        <div className="x-reference-ribbon x-reference-ribbon-two x-motion-drift-slow" />
        <div className="x-reference-ribbon x-reference-ribbon-three" />
        <div className="x-reference-ball x-motion-ball" />
        <div className="x-flag-band x-flag-band-top" />
        <div className="x-flag-band x-flag-band-bottom" />
        <div className="x-poster-trophy" />
        <div className="x-poster-ball" />
      </div>
      <div className="relative z-10 grid gap-5 p-4 sm:p-6 lg:min-h-[31rem] lg:grid-cols-[minmax(0,1fr)_22rem] lg:p-8">
        <div className="flex min-h-[22rem] flex-col justify-between sm:min-h-[24rem]">
          <div>
            <p className="inline-flex rounded-md border border-[#ffd23f]/35 bg-[#ffd23f]/15 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#ffe78d]">Official matchday terminal</p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/72">
              A World Cup arena for live predictions, matchday GameFi, AI agents, squads, and verifiable X Layer actions.
            </p>
          </div>
          <div>
            <div className="mb-4 flex flex-wrap gap-2">
              {["Live markets", "Match center", "GameFi loops", "AI agents"].map((item, index) => (
                <span key={item} className={`rounded-lg border px-2.5 py-1 text-xs font-black ${index % 2 ? "border-[#20f0c8]/25 bg-[#20f0c8]/10 text-[#9effec]" : "border-white/15 bg-white/[0.08] text-white/78"}`}>
                  {item}
                </span>
              ))}
            </div>
            <h1 className="max-w-4xl text-4xl font-black leading-[0.98] tracking-normal text-white sm:text-6xl lg:text-7xl">
              X Cup Arena
            </h1>
            <p className="mt-3 max-w-2xl text-2xl font-black leading-tight text-white sm:text-3xl">
              Trade the match. Rally the squad. Prove the win.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link className="flex items-center gap-2 rounded-lg bg-[#ffd23f] px-4 py-3 text-sm font-black text-[#151924] shadow-[0_1rem_2rem_rgba(255,210,63,0.25)] transition hover:bg-[#20f0c8]" href="/markets">
                Open Markets
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link className="flex items-center gap-2 rounded-lg border border-white/18 bg-white/[0.1] px-4 py-3 text-sm font-black text-white backdrop-blur-md transition hover:bg-white/18" href="/squads">
                Open Squads
                <Users size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
        <div className="grid content-end gap-3">
          <div className="rounded-lg border border-white/15 bg-[#071021]/72 p-4 shadow-[0_1.5rem_3rem_rgba(0,0,0,0.28)] backdrop-blur-md">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#20f0c8]">
              {refreshing ? "Refreshing live feed" : liveCount ? "Live now" : loading ? "Syncing feeds" : "Next top event"}
            </p>
            <p className="mt-3 text-xl font-black text-white">{featured ? formatLiveEventMatchup(featured) : feedError || leadNews?.title || "No live match available right now"}</p>
            <p className="mt-2 text-sm leading-6 text-white/68">
              {featured ? `${featured.league} - ${featured.status.detail}` : leadNews ? "Latest football headline while matches wait for the next live or scheduled event." : "Markets refresh from the real sports feed."}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {stats.map((stat) => (
              <motion.div
                key={stat.label}
                className="rounded-lg border border-white/15 bg-[#071021]/72 p-3 backdrop-blur-md"
                animate={{ opacity: [0.75, 1, 0.75] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/52">{stat.label}</p>
                  <stat.icon size={14} className="text-[#ffd23f]" aria-hidden="true" />
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

function LiveBoard({
  events,
  loading,
  refreshing,
  selectedEventId,
  onSelect
}: {
  events: LiveSportEvent[];
  loading: boolean;
  refreshing: boolean;
  selectedEventId: string;
  onSelect: (eventId: string) => void;
}) {
  return (
    <section id="matches" className="scroll-mt-28 rounded-lg border border-white/12 bg-white/[0.06] p-4 shadow-[0_1.5rem_3rem_rgba(0,0,0,0.18)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#20f0c8]">Top Board</p>
          <h2 className="mt-1 text-2xl font-black text-white">Matches</h2>
        </div>
        <div className="flex items-center gap-2">
          {refreshing ? <span className="rounded-lg border border-[#20f0c8]/25 bg-[#20f0c8]/10 px-2 py-1 text-[11px] font-black uppercase text-[#9effec]">Syncing</span> : null}
          <Link className="flex items-center gap-2 rounded-lg border border-white/12 bg-white/[0.07] px-3 py-2 text-xs font-black text-white transition hover:bg-white/14" href="/markets">
            All markets
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {loading && !events.length ? <SkeletonCards count={4} /> : null}
        {!loading && events.length ? events.slice(0, 6).map((event) => <EventMiniCard key={event.id} event={event} selected={event.id === selectedEventId} onSelect={() => onSelect(event.id)} />) : null}
        {!loading && !events.length ? (
          <div className="rounded-lg border border-white/10 bg-black/35 p-5 text-sm text-white/62 md:col-span-2">
            No live matches are available right now. Scheduled fixtures will appear here once the feed returns them.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function EventMiniCard({ event, selected, onSelect }: { event: LiveSportEvent; selected: boolean; onSelect: () => void }) {
  const isLive = event.status.state === "in";
  const scheduledTime = formatEventTime(event);
  return (
    <button
      className={`relative overflow-hidden rounded-lg border p-4 text-left transition hover:-translate-y-0.5 hover:bg-white/[0.08] ${selected ? "border-[#20f0c8]/50 bg-[#20f0c8]/12 shadow-[0_0_0_1px_rgba(32,240,200,0.16)]" : "border-white/12 bg-[#071021]/58"}`}
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#20f0c8] via-[#ffd23f] to-[#ff4f3d]" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white/52">{event.league}</p>
          <h3 className="mt-2 text-lg font-black text-white">{formatLiveEventMatchup(event)}</h3>
        </div>
        <span className={`rounded-lg border px-2 py-1 text-[11px] font-black uppercase ${isLive ? "border-[#20f0c8]/35 bg-[#20f0c8]/12 text-[#9effec]" : "border-white/12 bg-white/[0.07] text-white/64"}`}>
          {eventStatusLabel(event)}
        </span>
      </div>
      <p className="mt-3 text-sm text-white/64">{event.status.detail}</p>
      {scheduledTime ? <p className="mt-1 text-xs font-bold text-white/48">{isLive ? "Started" : "Kickoff"}: {scheduledTime}</p> : null}
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm font-black text-white">
        <span className="rounded-md border border-white/10 bg-white/[0.07] p-2">{event.awayTeam.shortName} {event.awayTeam.score ?? ""}</span>
        <span className="rounded-md border border-white/10 bg-white/[0.07] p-2">{event.homeTeam.shortName} {event.homeTeam.score ?? ""}</span>
      </div>
      <p className="mt-3 flex items-center gap-2 text-xs font-bold text-white/52">
        {isLive ? <CircleDot size={13} className="text-[#20f0c8]" aria-hidden="true" /> : <CalendarClock size={13} aria-hidden="true" />}
        {isLive ? "Open live match stats" : "Stats unlock live"}
      </p>
    </button>
  );
}

function MatchDetailsPanel({ event, details, loading }: { event: LiveSportEvent | null; details: LiveMatchDetails | null; loading: boolean }) {
  if (!event) {
    return null;
  }

  const isLive = event.status.state === "in";
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Match Center</p>
          <h2 className="mt-1 text-2xl font-black text-white">{formatLiveEventMatchup(event)}</h2>
          <p className="mt-2 text-sm leading-6 text-white/58">
            {isLive ? `${event.league} - ${event.status.detail}` : "Detailed corners, possession, scorers, assists, cards, substitutions, and lineups appear once this fixture is live."}
          </p>
        </div>
        <span className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-black uppercase ${isLive ? "border-[#18e3bd]/30 bg-[#18e3bd]/10 text-[#80ffe2]" : "border-white/10 bg-white/[0.06] text-white/58"}`}>
          {loading ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Radio size={14} aria-hidden="true" />}
          {isLive ? "Live stats" : "Locked"}
        </span>
      </div>

      {!isLive ? (
        <div className="mt-4 rounded-lg border border-white/10 bg-black/35 p-4 text-sm leading-6 text-white/62">
          Full match intelligence is only requested for active live matches, so pre-match cards stay clean and honest until the whistle goes.
        </div>
      ) : null}

      {isLive ? (
        <div className="mt-4 grid gap-4">
          {loading ? (
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/35 p-4 text-sm font-bold text-white/62">
              <Loader2 size={16} className="animate-spin text-[#18e3bd]" aria-hidden="true" />
              Syncing live match feed...
            </div>
          ) : null}
          {details?.message ? <p className="rounded-lg border border-[#f5a524]/25 bg-[#f5a524]/10 p-3 text-sm font-bold text-[#ffd48a]">{details.message}</p> : null}
          {details?.headlineStats.length ? (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {details.headlineStats.map((stat) => <StatPill key={stat.label} label={stat.label} away={stat.away} home={stat.home} />)}
            </div>
          ) : null}
          {details?.teamStats.length ? (
            <div className="rounded-lg border border-white/10 bg-black/35 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Team stats</p>
                <ListChecks size={16} className="text-[#18e3bd]" aria-hidden="true" />
              </div>
              <div className="mt-3 grid gap-2">
                {details.teamStats.slice(0, 14).map((stat) => <StatRow key={stat.label} label={stat.label} away={stat.away} home={stat.home} />)}
              </div>
            </div>
          ) : null}
          <div className="grid gap-4 lg:grid-cols-3">
            <PlayerEventList title="Goals and assists" empty="No scoring events in the live feed yet." events={details?.goals ?? []} />
            <PlayerEventList title="Cards" empty="No cards reported yet." events={details?.cards ?? []} />
            <PlayerEventList title="Substitutions" empty="No substitutions reported yet." events={details?.substitutions ?? []} />
          </div>
          {details?.lineups.length ? <LineupGrid lineups={details.lineups} /> : null}
        </div>
      ) : null}
    </section>
  );
}

function StatPill({ label, away, home }: { label: string; away: string; home: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/35 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/42">{label}</p>
      <div className="mt-2 flex items-center justify-between gap-3 text-lg font-black text-white">
        <span>{away}</span>
        <span className="text-xs text-white/32">VS</span>
        <span>{home}</span>
      </div>
    </div>
  );
}

function StatRow({ label, away, home }: { label: string; away: string; home: string }) {
  return (
    <div className="grid grid-cols-[4rem_minmax(0,1fr)_4rem] items-center gap-3 rounded-md bg-white/[0.04] px-3 py-2 text-sm">
      <span className="font-black text-white">{away}</span>
      <span className="truncate text-center text-xs font-bold uppercase tracking-[0.08em] text-white/46">{label}</span>
      <span className="text-right font-black text-white">{home}</span>
    </div>
  );
}

function PlayerEventList({ title, empty, events }: { title: string; empty: string; events: LiveMatchPlayerEvent[] }) {
  return (
    <section className="rounded-lg border border-white/10 bg-black/35 p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#18e3bd]">{title}</p>
      <div className="mt-3 grid gap-2">
        {events.slice(0, 8).map((event) => (
          <div key={event.id} className="rounded-md bg-white/[0.04] p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-black text-white">{event.player}</p>
              <span className="text-xs font-black text-[#f5a524]">{event.minute}</span>
            </div>
            <p className="mt-1 text-xs leading-5 text-white/52">
              {event.assist ? `Assist: ${event.assist}` : event.detail || event.team || "Live event"}
            </p>
          </div>
        ))}
        {!events.length ? <p className="text-sm leading-6 text-white/52">{empty}</p> : null}
      </div>
    </section>
  );
}

function LineupGrid({ lineups }: { lineups: Array<{ team: string; starters: string[]; substitutes: string[] }> }) {
  return (
    <section className="rounded-lg border border-white/10 bg-black/35 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Lineups and bench</p>
        <Flag size={16} className="text-[#18e3bd]" aria-hidden="true" />
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        {lineups.map((lineup) => (
          <div key={lineup.team} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <p className="font-black text-white">{lineup.team}</p>
            <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-white/38">Starters</p>
            <p className="mt-1 text-sm leading-6 text-white/62">{lineup.starters.length ? lineup.starters.join(", ") : "Awaiting lineup"}</p>
            <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-white/38">Substitutes</p>
            <p className="mt-1 text-sm leading-6 text-white/62">{lineup.substitutes.length ? lineup.substitutes.join(", ") : "Awaiting bench"}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function LiveNotifications({ items }: { items: Array<{ title: string; detail: string; tone: string }> }) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Live Notifications</p>
          <h2 className="mt-1 text-xl font-black text-white">Arena pulse</h2>
        </div>
        <Bell size={17} className="text-[#18e3bd]" aria-hidden="true" />
      </div>
      <div className="mt-4 grid gap-2">
        {items.map((item) => (
          <div key={`${item.title}-${item.detail}`} className="rounded-lg border border-white/10 bg-black/35 p-3">
            <div className="flex items-start gap-2">
              <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${item.tone === "live" ? "bg-[#18e3bd]" : item.tone === "danger" ? "bg-[#ff5c39]" : "bg-[#f5a524]"}`} />
              <div>
                <p className="text-sm font-black text-white">{item.title}</p>
                <p className="mt-1 text-xs leading-5 text-white/52">{item.detail}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
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
          <Link key={item.id} className="block rounded-lg border border-white/10 bg-black/35 p-3 transition hover:bg-white/[0.07]" href={`/news/${encodeURIComponent(item.id)}`}>
            <p className="text-sm font-black leading-5 text-white">{item.title}</p>
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/52">{item.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ProfileSettingsPanel({
  profile,
  preferences,
  onUpdateProfile,
  onUpdatePreferences
}: {
  profile: UserProfile;
  preferences: Preferences;
  onUpdateProfile: (profile: Partial<UserProfile>) => void;
  onUpdatePreferences: (preferences: Partial<Preferences>) => void;
}) {
  const toggles = [
    {
      label: "Push",
      enabled: preferences.notifications.push,
      toggle: () => onUpdatePreferences({ notifications: { ...preferences.notifications, push: !preferences.notifications.push } })
    },
    {
      label: "AI",
      enabled: preferences.notifications.ai,
      toggle: () => onUpdatePreferences({ notifications: { ...preferences.notifications, ai: !preferences.notifications.ai } })
    },
    {
      label: "Tx",
      enabled: preferences.notifications.transactions,
      toggle: () => onUpdatePreferences({ notifications: { ...preferences.notifications, transactions: !preferences.notifications.transactions } })
    }
  ];

  return (
    <section className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.045] p-4">
      <div id="profile" className="grid gap-3 rounded-lg border border-white/10 bg-black/35 p-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Profile</p>
          <UserRound size={16} className="text-[#18e3bd]" aria-hidden="true" />
        </div>
        <input
          className="rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-sm font-bold text-white outline-none focus:border-[#18e3bd]/60"
          placeholder="Display name"
          value={profile.displayName}
          onChange={(event) => onUpdateProfile({ displayName: event.target.value })}
        />
        <input
          className="rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-sm font-bold text-white outline-none focus:border-[#18e3bd]/60"
          placeholder="@username"
          value={profile.username}
          onChange={(event) => onUpdateProfile({ username: event.target.value })}
        />
      </div>
      <div id="settings" className="grid gap-2 rounded-lg border border-white/10 bg-black/35 p-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Settings</p>
          <Settings2 size={16} className="text-[#18e3bd]" aria-hidden="true" />
        </div>
        {toggles.map(({ label, enabled, toggle }) => (
          <button
            key={label}
            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs font-black uppercase tracking-[0.12em] ${enabled ? "border-[#18e3bd]/30 bg-[#18e3bd]/10 text-white" : "border-white/10 bg-white/[0.04] text-white/52"}`}
            type="button"
            onClick={toggle}
          >
            <span>{label}</span>
            <span>{enabled ? "On" : "Off"}</span>
          </button>
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
          <h2 className="mt-1 text-xl font-black text-white">Match Oracle</h2>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-lg border border-[#18e3bd]/25 bg-[#18e3bd]/10 text-[#80ffe2]">
          <Brain size={20} aria-hidden="true" />
        </span>
      </div>
      <div className="mt-4 rounded-lg border border-white/10 bg-black/35 p-3">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-white/38">Current read</p>
        <p className="mt-2 text-sm leading-6 text-white/70">
          {featured
            ? `${formatLiveEventMatchup(featured)}: live pressure is active. AI recommends small, verified prediction sizing before wallet confirmation.`
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

export function XLayerMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" role="img" aria-label="X Cup Arena">
      <defs>
        <linearGradient id="xcup-mark-field" x1="4" x2="36" y1="4" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#20f0c8" />
          <stop offset="0.42" stopColor="#2368ff" />
          <stop offset="0.68" stopColor="#f029a8" />
          <stop offset="1" stopColor="#ffd23f" />
        </linearGradient>
        <linearGradient id="xcup-mark-cup" x1="15" x2="26" y1="12" y2="29" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff3a8" />
          <stop offset="0.46" stopColor="#ffd23f" />
          <stop offset="1" stopColor="#b56a12" />
        </linearGradient>
      </defs>
      <rect width="36" height="36" x="2" y="2" rx="8" fill="#071021" />
      <path d="M5 8h30v7H5z" fill="#20f0c8" />
      <path d="M5 15h30v7H5z" fill="#2368ff" />
      <path d="M5 22h30v7H5z" fill="#ff4f3d" />
      <path d="M5 29h30v3.5A2.5 2.5 0 0 1 32.5 35H7.5A2.5 2.5 0 0 1 5 32.5V29z" fill="#ffd23f" />
      <path d="M7 5h26a2 2 0 0 1 2 2v26a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm0 0 26 30M33 5 7 35" stroke="url(#xcup-mark-field)" strokeWidth="2.2" />
      <path d="M18.3 12.5h3.4v2.4h5.5v2.2c0 2.9-1.9 5.2-4.5 5.8a4.7 4.7 0 0 1-1.2 1.5v2.2h3.6v2.6H14.9v-2.6h3.6v-2.2a4.7 4.7 0 0 1-1.2-1.5c-2.6-.6-4.5-2.9-4.5-5.8v-2.2h5.5v-2.4Zm-2.9 5v.2c0 1 .5 1.9 1.3 2.4v-2.6h-1.3Zm8 2.6c.8-.5 1.3-1.4 1.3-2.4v-.2h-1.3v2.6Z" fill="url(#xcup-mark-cup)" stroke="#151924" strokeWidth="0.65" />
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
