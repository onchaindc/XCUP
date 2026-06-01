"use client";

import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Brain,
  Bot,
  CloudSun,
  Gamepad2,
  Globe2,
  Home,
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
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatUnits } from "viem";
import { useAccount, useBalance, useConnect, useDisconnect } from "wagmi";
import { eventStatusLabel, formatEventTime, formatLiveEventMatchup, type LiveSportEvent, type SportsNewsItem } from "@/lib/sports";
import { xLayerTestnet } from "@/lib/arc";
import type { Preferences, UserProfile } from "@/lib/app-store";
import { useAppStore } from "@/lib/app-store";
import { applyTheme } from "@/lib/theme";
import { useNetworkStatus } from "@/lib/use-network-status";
import { errorMessage, shortAddress } from "@/lib/utils";
import { pickWalletConnector } from "@/lib/wallet";
import { AppAudioButton } from "@/components/AppAudioButton";
import { SiteFooter } from "@/components/SiteFooter";
import { WorldCupCountdown } from "@/components/WorldCupCountdown";

const topNav = [
  { label: "Home", href: "/", icon: Home, iconOnly: true },
  { label: "Predictions", href: "/arena", icon: Trophy },
  { label: "Live Board", href: "/arena", icon: Activity },
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
  const [feedError, setFeedError] = useState("");
  const [walletError, setWalletError] = useState("");
  const feedHydratedRef = useRef(false);
  const profile = useAppStore((state) => state.profile);
  const preferences = useAppStore((state) => state.preferences);
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

  const stats = useMemo(
    () => [
      { label: "Live matches", value: String(liveEvents.length), icon: Radio },
      { label: "Matches", value: String(events.length), icon: Globe2 },
      { label: "Headlines", value: String(news.length), icon: Newspaper },
      { label: "X Layer", value: isConnected && network.onArc ? "Ready" : "Mainnet", icon: ShieldCheck }
    ],
    [events.length, isConnected, liveEvents.length, network.onArc, news.length]
  );

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
            <LiveBoard events={events} loading={loadingFeeds} refreshing={refreshingFeeds} />
          </div>
          <aside className="grid content-start gap-4">
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
        <SiteFooter />
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const network = useNetworkStatus();
  const preferences = useAppStore((state) => state.preferences);
  const updatePreferences = useAppStore((state) => state.updatePreferences);
  const addRpcLabel = network.busy === "adding" ? "Adding" : "Add RPC";
  const switchLabel = network.busy === "switching" ? "Switching" : "Switch";

  return (
    <header className="sticky top-0 z-50 mb-4 border-b border-white/10 bg-[#030409]/90 backdrop-blur-xl md:py-3">
      <div className="flex h-14 items-center justify-between px-4 md:hidden">
        <Link className="flex shrink-0 items-center gap-3" href="/">
          <XLayerMark className="h-9 w-9 shrink-0" />
          <span className="shrink-0">
            <span className="block truncate text-base font-black text-white">X Cup Arena</span>
            <span className="block whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.22em] text-white/42">World Cup on X Layer</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <button className="flex max-w-[8.5rem] items-center gap-2 rounded-lg border border-white/12 bg-white/[0.07] px-3 py-2 text-left text-xs font-bold text-white transition hover:bg-white/12" type="button" onClick={onDisconnect}>
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
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="rounded-lg border border-[#1e2a3a] p-2 text-[#6b7a93] transition-colors hover:text-white"
            aria-label="Toggle menu"
            type="button"
          >
            {isMenuOpen ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>
      {isMenuOpen && (
        <div className="flex flex-col gap-1 border-t border-[#1e2a3a] bg-[#080c12]/95 px-4 py-3 backdrop-blur-sm md:hidden">
          {topNav.map((item) => (
            <NavLink key={item.label} item={item} className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-[#6b7a93] transition-all hover:bg-[#0d1320] hover:text-white" onClick={() => setIsMenuOpen(false)}>
              <item.icon size={16} aria-hidden="true" />
              {item.iconOnly ? <span className="sr-only">{item.label}</span> : item.label}
            </NavLink>
          ))}
          <div className="my-2 border-t border-[#1e2a3a]" />
          <div className="flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-medium text-[#6b7a93]">
            <WorldCupCountdown />
          </div>
          <div className="px-3 py-2">
            <AppAudioButton />
          </div>
          <button
            className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-[#6b7a93] transition-all hover:bg-[#0d1320] hover:text-white"
            type="button"
            onClick={() => updatePreferences({ theme: preferences.theme === "light" ? "dark" : "light" })}
          >
            <CloudSun size={16} aria-hidden="true" />
            {preferences.theme === "light" ? "Dark" : "Light"}
          </button>
          {network.wrongNetwork ? (
            <button
              className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-[#6b7a93] transition-all hover:bg-[#0d1320] hover:text-white"
              type="button"
              onClick={() => void network.switchNetwork()}
              disabled={network.syncing}
            >
              <ShieldCheck size={16} aria-hidden="true" />
              {switchLabel}
            </button>
          ) : null}
          <button
            className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-[#6b7a93] transition-all hover:bg-[#0d1320] hover:text-white"
            type="button"
            onClick={() => void network.addNetwork()}
            disabled={network.syncing}
          >
            <ShieldCheck size={16} aria-hidden="true" />
            {addRpcLabel}
          </button>
          <Link className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-[#6b7a93] transition-all hover:bg-[#0d1320] hover:text-white" href="/profile" onClick={() => setIsMenuOpen(false)}>
            <UserRound size={16} aria-hidden="true" />
            Profile
          </Link>
          <Link className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-[#6b7a93] transition-all hover:bg-[#0d1320] hover:text-white" href="/settings" onClick={() => setIsMenuOpen(false)}>
            <Settings2 size={16} aria-hidden="true" />
            Settings
          </Link>
        </div>
      )}
      <div className="hidden md:block">
      <div className="flex min-w-0 items-center justify-between gap-2 sm:gap-3">
        <Link className="flex shrink-0 items-center gap-3" href="/">
          <XLayerMark className="h-9 w-9 shrink-0" />
          <span className="shrink-0">
            <span className="block truncate text-base font-black text-white">X Cup Arena</span>
            <span className="block whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.22em] text-white/42">World Cup on X Layer</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] p-1 xl:flex">
          {topNav.map((item) => (
            <NavLink key={item.label} item={item} className={`${item.iconOnly ? "grid min-h-10 w-10 place-items-center px-0" : "flex min-h-10 items-center gap-2 px-3"} rounded-md text-xs font-black text-white/62 transition hover:bg-white/10 hover:text-white`}>
              <item.icon size={15} aria-hidden="true" />
              {item.iconOnly ? <span className="sr-only">{item.label}</span> : item.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <WorldCupCountdown />
          <AppAudioButton />
          <button
            className="grid h-10 min-w-10 place-items-center rounded-lg border border-white/10 bg-white/[0.04] px-2 text-xs font-black text-white/70 transition hover:bg-white/10 hover:text-white sm:flex sm:gap-2 sm:px-3"
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
              className="hidden min-h-10 items-center gap-2 rounded-lg border border-[#ff5c39]/25 bg-[#ff5c39]/12 px-3 py-2 text-xs font-black text-[#ffb09d] transition hover:bg-[#ff5c39]/18 sm:flex"
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
            className="grid h-10 min-w-10 place-items-center rounded-lg border border-white/10 bg-white/[0.04] px-2 text-xs font-black text-white/70 transition hover:bg-white/10 hover:text-white sm:flex sm:gap-2 sm:px-3"
            type="button"
            onClick={() => void network.addNetwork()}
            disabled={network.syncing}
            title="Add X Layer mainnet RPC to wallet"
            aria-label="Add X Layer mainnet RPC"
          >
            <ShieldCheck size={16} aria-hidden="true" />
            <span className="hidden sm:inline">{addRpcLabel}</span>
          </button>
          <Link className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-white/70 transition hover:bg-white/10 hover:text-white" href="/profile" aria-label="Profile">
            <UserRound size={16} aria-hidden="true" />
          </Link>
          <Link className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-white/70 transition hover:bg-white/10 hover:text-white" href="/settings" aria-label="Settings">
            <Settings2 size={16} aria-hidden="true" />
          </Link>
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
      </div>
      {network.networkError ? <p className="mt-2 rounded-lg border border-[#ff5c39]/25 bg-[#ff5c39]/10 px-3 py-2 text-xs font-bold text-[#ffb09d]">{network.networkError}</p> : null}
      {network.networkNotice ? <p className="mt-2 rounded-lg border border-[#18e3bd]/25 bg-[#18e3bd]/10 px-3 py-2 text-xs font-bold text-[#80ffe2]">{network.networkNotice}</p> : null}
      <nav className="mt-3 grid grid-cols-3 gap-1 rounded-lg border border-white/10 bg-white/[0.04] p-1 sm:grid-cols-6 xl:hidden">
        {topNav.map((item) => (
          <NavLink key={item.label} item={item} className="flex min-h-10 items-center justify-center gap-1 rounded-md px-1 text-[11px] font-black text-white/62 transition hover:bg-white/10 hover:text-white">
            <item.icon size={14} aria-hidden="true" />
            {item.iconOnly ? <span className="sr-only">{item.label}</span> : item.label}
          </NavLink>
        ))}
      </nav>
      </div>
    </header>
  );
}

function NavLink({
  item,
  className,
  children,
  onClick
}: {
  item: (typeof topNav)[number];
  className: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link className={className} href={item.href} onClick={onClick} aria-label={item.iconOnly ? item.label : undefined}>
      {children}
    </Link>
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
    <section className="relative overflow-hidden rounded-lg border border-white/10 bg-black">
      <div className="absolute inset-0 opacity-90">
        <div className="x-reference-grid" />
        <div className="x-reference-ribbon x-reference-ribbon-one x-motion-drift" />
        <div className="x-reference-ribbon x-reference-ribbon-two x-motion-drift-slow" />
        <div className="x-reference-ribbon x-reference-ribbon-three" />
        <div className="x-reference-ball x-motion-ball" />
        <div className="x-flag-band x-flag-band-top" />
        <div className="x-flag-band x-flag-band-bottom" />
      </div>
      <div className="relative z-10 grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-h-[18rem] flex-col justify-between sm:min-h-[22rem]">
          <div>
            <p className="text-lg font-light tracking-normal text-white sm:text-2xl">X Cup Arena</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/62">
              A World Cup arena for live predictions, matchday GameFi, AI agents, squads, and verifiable X Layer actions.
            </p>
          </div>
          <div>
            <div className="mb-4 flex flex-wrap gap-2">
              {["Live markets", "Match center", "GameFi loops", "AI agents"].map((item) => (
                <span key={item} className="rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs font-bold text-white/70">
                  {item}
                </span>
              ))}
            </div>
            <h1 className="max-w-3xl text-3xl font-black leading-[1.02] tracking-normal text-white sm:text-4xl lg:text-5xl">
              Trade the match. Rally the squad. Prove the win.
            </h1>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-black text-black transition hover:bg-[#18e3bd]" href="/arena">
                Open Predictions
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link className="flex items-center gap-2 rounded-lg border border-white/12 bg-white/[0.06] px-3 py-2 text-sm font-black text-white transition hover:bg-white/12" href="/squads">
                Open Squads
                <Users size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
        <div className="grid content-end gap-3">
          <div className="rounded-lg border border-white/10 bg-black/55 p-4 backdrop-blur-md">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">
              {refreshing ? "Refreshing live feed" : liveCount ? "Live now" : loading ? "Syncing feeds" : "Next top event"}
            </p>
            <p className="mt-3 text-xl font-black text-white">{featured ? formatLiveEventMatchup(featured) : feedError || leadNews?.title || "No live match available right now"}</p>
            <p className="mt-2 text-sm leading-6 text-white/58">
              {featured ? `${featured.league} - ${featured.status.detail}` : leadNews ? "Latest football headline while matches wait for the next live or scheduled event." : "Predictions refresh from the real sports feed."}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
    <section id="matches" className="scroll-mt-28 rounded-lg border border-white/10 bg-white/[0.045] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Top Board</p>
          <h2 className="mt-1 text-2xl font-black text-white">Matches</h2>
        </div>
        <div className="flex items-center gap-2">
          {refreshing ? <span className="rounded-lg border border-[#18e3bd]/20 bg-[#18e3bd]/10 px-2 py-1 text-[11px] font-black uppercase text-[#80ffe2]">Syncing</span> : null}
          <Link className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-black text-white transition hover:bg-white/12" href="/arena">
            All predictions
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {loading && !events.length ? <SkeletonCards count={4} /> : null}
        {!loading && events.length ? events.slice(0, 6).map((event) => <EventMiniCard key={event.id} event={event} />) : null}
        {!loading && !events.length ? (
          <div className="rounded-lg border border-white/10 bg-black/35 p-5 text-sm text-white/62 md:col-span-2">
            No live matches are available right now. Scheduled fixtures will appear here once the feed returns them.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function EventMiniCard({ event }: { event: LiveSportEvent }) {
  const isLive = event.status.state === "in";
  const scheduledTime = formatEventTime(event);
  return (
    <article className="rounded-lg border border-white/10 bg-black/35 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white/42">{event.league}</p>
          <h3 className="mt-2 text-lg font-black text-white">{formatLiveEventMatchup(event)}</h3>
        </div>
        <span className={`rounded-lg border px-2 py-1 text-[11px] font-black uppercase ${isLive ? "border-[#18e3bd]/30 bg-[#18e3bd]/10 text-[#80ffe2]" : "border-white/10 bg-white/[0.06] text-white/60"}`}>
          {eventStatusLabel(event)}
        </span>
      </div>
      <p className="mt-3 text-sm text-white/58">{event.status.detail}</p>
      {scheduledTime ? <p className="mt-1 text-xs font-bold text-white/42">{isLive ? "Started" : "Kickoff"}: {scheduledTime}</p> : null}
      <div className="mt-4 grid grid-cols-1 gap-2 text-sm font-black text-white sm:grid-cols-2">
        <TeamMini name={event.awayTeam.shortName} score={event.awayTeam.score} logo={event.awayTeam.logo} />
        <TeamMini name={event.homeTeam.shortName} score={event.homeTeam.score} logo={event.homeTeam.logo} />
      </div>
      {isLive ? (
        <Link className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-[#18e3bd]/30 bg-[#18e3bd]/10 px-3 py-2 text-sm font-black text-[#80ffe2] transition hover:bg-[#18e3bd]/18" href={`/matches/live?id=${encodeURIComponent(event.id)}`}>
          Open live details
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      ) : null}
    </article>
  );
}

function TeamMini({ name, score, logo }: { name: string; score?: string; logo?: string }) {
  return (
    <span className="flex items-center gap-2 rounded-md bg-white/[0.06] p-2">
      {logo ? <img className="h-6 w-6 rounded object-contain" src={logo} alt="" /> : null}
      <span className="truncate">{name} {score ?? ""}</span>
    </span>
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
    <svg className={className} viewBox="0 0 40 40" role="img" aria-label="X Layer">
      <rect width="8" height="8" x="4" y="4" fill="currentColor" />
      <rect width="8" height="8" x="16" y="4" fill="currentColor" opacity="0.72" />
      <rect width="8" height="8" x="4" y="16" fill="currentColor" opacity="0.72" />
      <rect width="8" height="8" x="28" y="4" fill="currentColor" opacity="0.42" />
      <rect width="8" height="8" x="16" y="16" fill="currentColor" />
      <g aria-hidden="true">
        <path d="M19 13h2v2h4v2.2c0 2-1.3 3.7-3.1 4.2A3.7 3.7 0 0 1 21 23v2h3v2h-8v-2h3v-2c-.4-.4-.7-.9-.9-1.6A4.4 4.4 0 0 1 15 17.2V15h4v-2Zm-2 4v.2c0 .9.5 1.7 1.2 2.1V17H17Zm4.8 2.3c.7-.4 1.2-1.2 1.2-2.1V17h-1.2v2.3Z" fill="#151924" stroke="#f5a524" strokeWidth="0.7" />
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
