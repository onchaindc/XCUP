"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  Camera,
  ChevronRight,
  Crown,
  Flag,
  Medal,
  Music2,
  Palette,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserRound,
  Wallet
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatUnits } from "viem";
import { useAccount, useBalance, useConnect, useDisconnect } from "wagmi";
import { useAppStore, type Preferences, type UserProfile } from "@/lib/app-store";
import { xLayerTestnet } from "@/lib/arc";
import { DEFAULT_MATCHDAY_AUDIO, MATCHDAY_AUDIO_TRACKS } from "@/lib/audio-tracks";
import { clearLocalAuthSession, readLocalAuthSession, type LocalAuthSession } from "@/lib/session";
import { errorMessage } from "@/lib/utils";
import { pickWalletConnector } from "@/lib/wallet";
import { SiteFooter } from "@/components/SiteFooter";
import { KickoffLoader, TopHeader } from "@/components/XCupApp";

type ProfileTab = "overview" | "predictions" | "fantasy" | "achievements" | "activity" | "settings";

const tabs: Array<{ id: ProfileTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "predictions", label: "Predictions" },
  { id: "fantasy", label: "Fantasy XI" },
  { id: "achievements", label: "Achievements" },
  { id: "activity", label: "Activity" },
  { id: "settings", label: "Settings" }
];

export function ProfilePage({ initialTab = "overview" }: { initialTab?: ProfileTab }) {
  const [showLoader, setShowLoader] = useState(true);
  const [tab, setTab] = useState<ProfileTab>(initialTab);
  const [walletError, setWalletError] = useState("");
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);
  const profile = useAppStore((state) => state.profile);
  const preferences = useAppStore((state) => state.preferences);
  const activities = useAppStore((state) => state.activities);
  const updateProfile = useAppStore((state) => state.updateProfile);
  const updatePreferences = useAppStore((state) => state.updatePreferences);
  const { address, isConnected } = useAccount();
  const { connectors, connectAsync, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({
    address,
    chainId: xLayerTestnet.id,
    query: { enabled: Boolean(address) }
  });
  const formattedBalance = balance ? `${Number(formatUnits(balance.value, balance.decimals)).toFixed(4)} ${balance.symbol}` : "0.0000 OKB";

  useEffect(() => {
    const timer = window.setTimeout(() => setShowLoader(false), 900);
    return () => window.clearTimeout(timer);
  }, []);

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

  async function uploadProfileImage(file: File, field: "avatarUrl" | "bannerUrl") {
    if (!file.type.startsWith("image/")) {
      setWalletError("Choose an image file.");
      return;
    }
    if (file.size > 1_400_000) {
      setWalletError("Image is too large. Keep profile uploads under 1.4MB.");
      return;
    }
    updateProfile({ [field]: await readFileAsDataUrl(file) });
    setWalletError("");
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
        <ProfileHero
          profile={profile}
          preferences={preferences}
          avatarInputRef={avatarInputRef}
          bannerInputRef={bannerInputRef}
          uploadProfileImage={uploadProfileImage}
        />
        <section className="mt-4 rounded-lg border border-white/10 bg-white/[0.045] p-2">
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-6">
            {tabs.map((item) => (
              <button key={item.id} className={`rounded-md px-3 py-2 text-xs font-black transition ${tab === item.id ? "bg-white text-black" : "text-white/58 hover:bg-white/10 hover:text-white"}`} type="button" onClick={() => setTab(item.id)}>
                {item.label}
              </button>
            ))}
          </div>
        </section>
        <AnimatePresence mode="wait">
          <motion.section key={tab} className="mt-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            {tab === "overview" ? <OverviewTab profile={profile} preferences={preferences} activities={activities} /> : null}
            {tab === "predictions" ? <PredictionsTab profile={profile} /> : null}
            {tab === "fantasy" ? <FantasyTab /> : null}
            {tab === "achievements" ? <AchievementsTab /> : null}
            {tab === "activity" ? <ActivityTab preferences={preferences} activities={activities} /> : null}
            {tab === "settings" ? (
              <SettingsTab
                profile={profile}
                preferences={preferences}
                updateProfile={updateProfile}
                updatePreferences={updatePreferences}
                avatarInputRef={avatarInputRef}
                bannerInputRef={bannerInputRef}
                uploadProfileImage={uploadProfileImage}
              />
            ) : null}
          </motion.section>
        </AnimatePresence>
        <SiteFooter />
      </div>
    </main>
  );
}

function ProfileHero({
  profile,
  preferences,
  avatarInputRef,
  bannerInputRef,
  uploadProfileImage
}: {
  profile: UserProfile;
  preferences: Preferences;
  avatarInputRef: React.RefObject<HTMLInputElement | null>;
  bannerInputRef: React.RefObject<HTMLInputElement | null>;
  uploadProfileImage: (file: File, field: "avatarUrl" | "bannerUrl") => void | Promise<void>;
}) {
  const xp = profile.xp ?? 0;
  const level = profile.prestigeLevel ?? 1;
  return (
    <section className="overflow-hidden rounded-lg border border-white/10 bg-black">
      <input ref={avatarInputRef} className="hidden" type="file" accept="image/*" onChange={(event) => event.target.files?.[0] ? void uploadProfileImage(event.target.files[0], "avatarUrl") : undefined} />
      <input ref={bannerInputRef} className="hidden" type="file" accept="image/*" onChange={(event) => event.target.files?.[0] ? void uploadProfileImage(event.target.files[0], "bannerUrl") : undefined} />
      <div className="relative min-h-36 overflow-hidden border-b border-white/10 bg-black sm:min-h-40">
        {profile.bannerUrl ? <img className="absolute inset-0 h-full w-full object-cover opacity-75" src={profile.bannerUrl} alt="" /> : null}
        <div className="absolute inset-0 opacity-70">
          <div className="x-reference-grid absolute inset-0 opacity-30" />
          <div className="absolute -left-10 top-4 max-w-md text-6xl font-black leading-[0.82] tracking-normal text-white/10 sm:text-8xl" aria-hidden="true">focused_<br />verified_</div>
          <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle,rgba(255,255,255,0.20)_1px,transparent_1px)] [background-size:7px_7px] opacity-30" aria-hidden="true" />
          <div className="absolute right-16 top-0 h-full w-28 -skew-x-12 bg-white/10" aria-hidden="true" />
        </div>
        <button className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-lg border border-white/12 bg-black/45 text-white backdrop-blur-md transition hover:bg-white/12" type="button" onClick={() => bannerInputRef.current?.click()} aria-label="Upload banner">
          <Camera size={16} aria-hidden="true" />
        </button>
      </div>
      <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_25rem]">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
          <button className="-mt-10 grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-full border border-white/15 bg-[#090d14] text-white shadow-2xl ring-4 ring-black sm:-mt-12 sm:h-28 sm:w-28" type="button" onClick={() => avatarInputRef.current?.click()} aria-label="Upload avatar">
            {profile.avatarUrl ? <img className="h-full w-full object-cover" src={profile.avatarUrl} alt="" /> : <UserRound size={42} aria-hidden="true" />}
          </button>
          <div className="min-w-0 max-w-full">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Competitor identity</p>
            <h1 className="mt-1 max-w-full break-words text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">{profile.displayName || "Unnamed manager"}</h1>
            {preferences.privacy.publicProfile ? (
              <>
                <p className="mt-2 text-sm font-bold text-white/54">{profile.username || "@manager"} - {profile.squadAffiliation || "No squad yet"}</p>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/62">{profile.bio || "Set a short status in settings."}</p>
              </>
            ) : (
              <p className="mt-3 max-w-2xl rounded-lg border border-white/10 bg-white/[0.045] p-3 text-sm font-bold text-white/62">Private profile is enabled. Public bio, handle, and squad affiliation are hidden.</p>
            )}
          </div>
        </div>
        <div className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.045] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/42">Prestige level</p>
              <p className="mt-1 text-2xl font-black text-[#18e3bd]">Level {level}</p>
            </div>
            <Sparkles className="text-[#f5a524]" size={24} aria-hidden="true" />
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-black/45">
            <div className="h-full rounded-full bg-[#18e3bd]" style={{ width: `${Math.min(100, xp / 10)}%` }} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <MiniMetric icon={Trophy} label="Rank" value={profile.globalRanking || "Unranked"} />
            <MiniMetric icon={Flag} label="Country" value={profile.country || "Open"} />
            <MiniMetric icon={Crown} label="XP" value={String(xp)} />
          </div>
        </div>
      </div>
    </section>
  );
}

function OverviewTab({ profile, preferences, activities }: { profile: UserProfile; preferences: Preferences; activities: Array<{ id: string; title: string; detail: string }> }) {
  const stats = [
    ["Accuracy", `${profile.predictionAccuracy ?? 0}%`],
    ["Win streak", String(profile.winStreak ?? 0)],
    ["Predictions", String(profile.totalPredictions ?? 0)],
    ["Squad score", String(profile.squadContributionScore ?? 0)],
    ["Fantasy points", String(profile.fantasyPoints ?? 0)],
    ["Territory wins", String(profile.territoryWins ?? 0)]
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <section className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.045] p-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map(([label, value]) => <StatCard key={label} label={label} value={value} />)}
      </section>
      <section className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Recent activity</p>
        <div className="mt-4 grid gap-2">
          {preferences.privacy.showActivity ? activities.slice(0, 5).map((activity) => <TimelineItem key={activity.id} title={activity.title} detail={activity.detail} />) : null}
          {!preferences.privacy.showActivity ? <p className="text-sm text-white/58">Activity is hidden by your privacy settings.</p> : null}
          {preferences.privacy.showActivity && !activities.length ? <p className="text-sm text-white/58">No activity yet.</p> : null}
        </div>
      </section>
    </div>
  );
}

function PredictionsTab({ profile }: { profile: UserProfile }) {
  return <Panel title="Prediction analytics" empty={`No prediction history yet. Accuracy starts at ${profile.predictionAccuracy ?? 0}%.`} />;
}

function FantasyTab() {
  return <Panel title="Fantasy XI" empty="Saved lineups, tactical boards, chemistry scores, and favorite players appear after you lock a lineup." />;
}

function AchievementsTab() {
  return <Panel title="Trophy case" empty="No achievements unlocked yet. Seasonal badges and NFT achievements appear here when earned." />;
}

function ActivityTab({ preferences, activities }: { preferences: Preferences; activities: Array<{ id: string; title: string; detail: string }> }) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Activity timeline</p>
      <div className="mt-4 grid gap-2">
        {preferences.privacy.showActivity ? activities.map((activity) => <TimelineItem key={activity.id} title={activity.title} detail={activity.detail} />) : null}
        {!preferences.privacy.showActivity ? <p className="text-sm text-white/58">Activity is hidden by your privacy settings.</p> : null}
        {preferences.privacy.showActivity && !activities.length ? <p className="text-sm text-white/58">No chat, tips, uploads, or challenge wins yet.</p> : null}
      </div>
    </section>
  );
}

export function SettingsTab({
  profile,
  preferences,
  updateProfile,
  updatePreferences,
  avatarInputRef,
  bannerInputRef,
  uploadProfileImage
}: {
  profile: UserProfile;
  preferences: Preferences;
  updateProfile: (profile: Partial<UserProfile>) => void;
  updatePreferences: (preferences: Partial<Preferences>) => void;
  avatarInputRef: React.RefObject<HTMLInputElement | null>;
  bannerInputRef: React.RefObject<HTMLInputElement | null>;
  uploadProfileImage: (file: File, field: "avatarUrl" | "bannerUrl") => void | Promise<void>;
}) {
  const notificationItems = [
    ["Match reminders", "matchReminders"],
    ["Squad mentions", "squadMentions"],
    ["Live score alerts", "liveScoreAlerts"],
    ["Transfer news", "transferNewsAlerts"],
    ["Challenge invites", "challengeInvites"]
  ] as const;
  const privacyItems = [
    ["Public profile", "publicProfile"],
    ["Squad invites", "squadInvites"],
    ["Show activity", "showActivity"],
    ["Messages", "directMessages"]
  ] as const;
  const [settingsStatus, setSettingsStatus] = useState("");
  const [currentSession, setCurrentSession] = useState<LocalAuthSession | null>(null);
  const selectedTrack = MATCHDAY_AUDIO_TRACKS.find((track) => track.id === preferences.audio.trackId) ?? DEFAULT_MATCHDAY_AUDIO;
  const customAudio = preferences.audio.trackId === "custom";

  useEffect(() => {
    setCurrentSession(readLocalAuthSession());
  }, []);

  async function toggleNotification(label: string, key: (typeof notificationItems)[number][1]) {
    const nextEnabled = !preferences.notifications[key];
    if (nextEnabled && typeof window !== "undefined" && "Notification" in window) {
      const permission = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
      if (permission !== "granted") {
        setSettingsStatus("Browser notifications are blocked. The preference was not enabled.");
        return;
      }
      new Notification(`X Cup ${label}`, { body: `${label} notifications are now active.` });
    }
    updatePreferences({ notifications: { ...preferences.notifications, [key]: nextEnabled } });
    setSettingsStatus(nextEnabled ? `${label} notifications enabled.` : `${label} notifications disabled.`);
  }

  function updateActiveSessions(enabled: boolean) {
    updatePreferences({ security: { ...preferences.security, activeSessions: enabled } });
    if (!enabled) {
      clearLocalAuthSession();
      setCurrentSession(null);
      setSettingsStatus("Saved auth sessions cleared on this device.");
      return;
    }
    setSettingsStatus("Active session tracking enabled for future logins.");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.045] p-4">
        <SectionTitle icon={UserRound} title="Account" />
        <input className="rounded-lg border border-white/10 bg-black/35 px-3 py-3 text-sm font-bold text-white outline-none focus:border-[#18e3bd]/60" placeholder="Display name" value={profile.displayName} onChange={(event) => updateProfile({ displayName: event.target.value })} />
        <input className="rounded-lg border border-white/10 bg-black/35 px-3 py-3 text-sm font-bold text-white outline-none focus:border-[#18e3bd]/60" placeholder="@username" value={profile.username} onChange={(event) => updateProfile({ username: event.target.value })} />
        <textarea className="min-h-24 resize-none rounded-lg border border-white/10 bg-black/35 px-3 py-3 text-sm font-bold text-white outline-none focus:border-[#18e3bd]/60" placeholder="Bio/status" value={profile.bio ?? ""} onChange={(event) => updateProfile({ bio: event.target.value })} />
        <div className="flex flex-wrap gap-2">
          <button className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-black text-white hover:bg-white/12" type="button" onClick={() => avatarInputRef.current?.click()}>Upload avatar</button>
          <button className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-black text-white hover:bg-white/12" type="button" onClick={() => bannerInputRef.current?.click()}>Upload banner</button>
        </div>
        <input ref={avatarInputRef} className="hidden" type="file" accept="image/*" onChange={(event) => event.target.files?.[0] ? void uploadProfileImage(event.target.files[0], "avatarUrl") : undefined} />
        <input ref={bannerInputRef} className="hidden" type="file" accept="image/*" onChange={(event) => event.target.files?.[0] ? void uploadProfileImage(event.target.files[0], "bannerUrl") : undefined} />
      </section>
      <section className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.045] p-4">
        <SectionTitle icon={Bell} title="Notifications" />
        {notificationItems.map(([label, key]) => <ToggleRow key={key} label={label} enabled={preferences.notifications[key]} toggle={() => void toggleNotification(label, key)} />)}
        {settingsStatus ? <p className="rounded-lg border border-white/10 bg-black/35 p-3 text-sm font-bold text-white/62">{settingsStatus}</p> : null}
      </section>
      <section className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.045] p-4">
        <SectionTitle icon={ShieldCheck} title="Privacy" />
        {privacyItems.map(([label, key]) => <ToggleRow key={key} label={label} enabled={preferences.privacy[key]} toggle={() => updatePreferences({ privacy: { ...preferences.privacy, [key]: !preferences.privacy[key] } })} />)}
      </section>
      <section className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.045] p-4">
        <SectionTitle icon={Palette} title="Appearance" />
        <div className="flex flex-wrap gap-2">
          {["#18e3bd", "#42a5ff", "#f5a524", "#ff5c39"].map((accentColor) => (
            <button key={accentColor} className={`h-10 w-10 rounded-full border ${preferences.accentColor === accentColor ? "border-white" : "border-white/15"}`} style={{ backgroundColor: accentColor }} type="button" onClick={() => updatePreferences({ accentColor })} aria-label={`Accent ${accentColor}`} />
          ))}
        </div>
        <ToggleRow label="Reduced motion" enabled={preferences.reduceMotion} toggle={() => updatePreferences({ reduceMotion: !preferences.reduceMotion })} />
        <SectionTitle icon={Music2} title="Matchday music" />
        <select
          className="rounded-lg border border-white/10 bg-black/35 px-3 py-3 text-sm font-black text-white outline-none focus:border-[#18e3bd]/60"
          value={preferences.audio.trackId}
          onChange={(event) => {
            const track = MATCHDAY_AUDIO_TRACKS.find((item) => item.id === event.target.value);
            if (track) {
              updatePreferences({ audio: { ...preferences.audio, trackId: track.id, src: track.src } });
              return;
            }
            updatePreferences({ audio: { ...preferences.audio, trackId: "custom", src: preferences.audio.src || DEFAULT_MATCHDAY_AUDIO.src } });
          }}
        >
          {MATCHDAY_AUDIO_TRACKS.map((track) => <option key={track.id} value={track.id}>{track.label}</option>)}
          <option value="custom">Custom uploaded file path</option>
        </select>
        {customAudio ? (
          <input
            className="rounded-lg border border-white/10 bg-black/35 px-3 py-3 text-sm font-bold text-white outline-none focus:border-[#18e3bd]/60"
            placeholder="/audio/your-file.mp3"
            value={preferences.audio.src}
            onChange={(event) => updatePreferences({ audio: { ...preferences.audio, src: event.target.value || DEFAULT_MATCHDAY_AUDIO.src } })}
          />
        ) : (
          <p className="rounded-lg border border-white/10 bg-black/35 p-3 text-xs font-bold text-white/54">Now selected: {selectedTrack.label}</p>
        )}
        <label className="grid gap-2 text-sm font-bold text-white/58">
          Music volume
          <input className="accent-[#18e3bd]" type="range" min="0.12" max="0.75" step="0.03" value={preferences.audio.volume} onChange={(event) => updatePreferences({ audio: { ...preferences.audio, volume: Number(event.target.value) } })} />
        </label>
        <SectionTitle icon={Wallet} title="Security" />
        <ToggleRow label="Wallet approvals" enabled={preferences.security.requireApproval} toggle={() => updatePreferences({ security: { ...preferences.security, requireApproval: !preferences.security.requireApproval } })} />
        <label className="grid gap-2 text-sm font-bold text-white/58">
          Approval limit
          <input className="rounded-lg border border-white/10 bg-black/35 px-3 py-3 text-sm font-bold text-white outline-none focus:border-[#18e3bd]/60" value={preferences.security.approvalLimit} onChange={(event) => updatePreferences({ security: { ...preferences.security, approvalLimit: event.target.value } })} placeholder="100" />
        </label>
        <ToggleRow label="Active sessions" enabled={preferences.security.activeSessions} toggle={() => updateActiveSessions(!preferences.security.activeSessions)} />
        <div className="rounded-lg border border-white/10 bg-black/35 p-3 text-xs font-bold text-white/54">
          {currentSession && preferences.security.activeSessions ? `Current session: ${currentSession.mode} wallet unlocked ${new Date(currentSession.unlockedAt).toLocaleString()}` : "No saved auth session on this device."}
        </div>
      </section>
    </div>
  );
}

function Panel({ title, empty }: { title: string; empty: string }) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">{title}</p>
      <p className="mt-4 rounded-lg border border-white/10 bg-black/35 p-5 text-sm leading-6 text-white/60">{empty}</p>
    </section>
  );
}

function MiniMetric({ icon: Icon, label, value }: { icon: typeof Trophy; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/35 p-3">
      <Icon size={15} className="text-[#18e3bd]" aria-hidden="true" />
      <p className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-white/38">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-white">{value}</p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <motion.div className="rounded-lg border border-white/10 bg-black/35 p-4" whileHover={{ y: -2 }}>
      <Medal size={18} className="text-[#f5a524]" aria-hidden="true" />
      <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-white/38">{label}</p>
      <p className="mt-1 text-2xl font-black text-white">{value}</p>
    </motion.div>
  );
}

function TimelineItem({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/35 p-3">
      <div>
        <p className="font-black text-white">{title}</p>
        <p className="mt-1 text-xs text-white/46">{detail}</p>
      </div>
      <ChevronRight size={16} className="text-white/32" aria-hidden="true" />
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: typeof UserRound; title: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">{title}</p>
      <Icon size={16} className="text-[#18e3bd]" aria-hidden="true" />
    </div>
  );
}

function ToggleRow({ label, enabled, toggle }: { label: string; enabled: boolean; toggle: () => void }) {
  return (
    <button className={`flex items-center justify-between rounded-lg border px-3 py-3 text-sm font-black ${enabled ? "border-[#18e3bd]/30 bg-[#18e3bd]/10 text-white" : "border-white/10 bg-black/35 text-white/52"}`} type="button" onClick={toggle}>
      <span>{label}</span>
      <span>{enabled ? "On" : "Off"}</span>
    </button>
  );
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
