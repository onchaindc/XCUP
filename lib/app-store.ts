"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_MATCHDAY_AUDIO } from "@/lib/audio-tracks";

export type ThemeMode = "dark" | "light" | "system";
export type WalletMode = "embedded" | "external" | null;
export type ActivityType = "payment" | "faucet" | "invoice" | "swap";
export type ActivityStatus = "pending" | "confirmed" | "failed";

export type Activity = {
  id: string;
  type: ActivityType;
  title: string;
  detail: string;
  hash?: string;
  status: ActivityStatus;
  createdAt: string;
};

export type Invoice = {
  id: string;
  amount: string;
  token: string;
  settlementToken: string;
  expiry: string;
  status: "open" | "paid" | "expired";
  paymentLink: string;
  createdAt: string;
};

export type ConnectedWallet = {
  address: `0x${string}`;
  label: string;
  mode: Exclude<WalletMode, null>;
  primary: boolean;
};

export type UserProfile = {
  username: string;
  displayName: string;
  avatarUrl?: string;
  bannerUrl?: string;
  squadAffiliation?: string;
  globalRanking?: string;
  xp?: number;
  prestigeLevel?: number;
  country?: string;
  bio?: string;
  predictionAccuracy?: number;
  winStreak?: number;
  totalPredictions?: number;
  squadContributionScore?: number;
  fantasyPoints?: number;
  territoryWins?: number;
  favoriteClub?: string;
  favoriteNationalTeam?: string;
};

export type Preferences = {
  theme: ThemeMode;
  accentColor: string;
  reduceMotion: boolean;
  notifications: {
    push: boolean;
    email: boolean;
    merchant: boolean;
    ai: boolean;
    transactions: boolean;
    matchReminders: boolean;
    squadMentions: boolean;
    liveScoreAlerts: boolean;
    transferNewsAlerts: boolean;
    challengeInvites: boolean;
  };
  privacy: {
    publicProfile: boolean;
    squadInvites: boolean;
    showActivity: boolean;
    directMessages: boolean;
  };
  security: {
    biometrics: boolean;
    approvalLimit: string;
    requireApproval: boolean;
    activeSessions: boolean;
  };
  audio: {
    trackId: string;
    src: string;
    volume: number;
  };
};

type AppState = {
  walletMode: WalletMode;
  embeddedAddress: `0x${string}` | null;
  activeAddress: `0x${string}` | null;
  profile: UserProfile;
  preferences: Preferences;
  wallets: ConnectedWallet[];
  activities: Activity[];
  invoices: Invoice[];
  setWalletMode: (mode: WalletMode) => void;
  logout: () => void;
  setEmbeddedAddress: (address: `0x${string}` | null) => void;
  setActiveAddress: (address: `0x${string}` | null) => void;
  upsertWallet: (wallet: ConnectedWallet) => void;
  removeWallet: (address: `0x${string}`) => void;
  setPrimaryWallet: (address: `0x${string}`) => void;
  updateProfile: (profile: Partial<UserProfile>) => void;
  updatePreferences: (preferences: Partial<Preferences>) => void;
  addActivity: (activity: Omit<Activity, "id" | "createdAt">) => Activity;
  updateActivity: (id: string, activity: Partial<Activity>) => void;
  addInvoice: (invoice: Omit<Invoice, "id" | "paymentLink" | "createdAt" | "status">) => Invoice;
};

const defaultPreferences: Preferences = {
  theme: "dark",
  accentColor: "#18e3bd",
  reduceMotion: false,
  notifications: {
    push: false,
    email: false,
    merchant: true,
    ai: true,
    transactions: true,
    matchReminders: true,
    squadMentions: true,
    liveScoreAlerts: true,
    transferNewsAlerts: true,
    challengeInvites: true
  },
  privacy: {
    publicProfile: true,
    squadInvites: true,
    showActivity: true,
    directMessages: true
  },
  security: {
    biometrics: false,
    approvalLimit: "100",
    requireApproval: true,
    activeSessions: true
  },
  audio: {
    trackId: DEFAULT_MATCHDAY_AUDIO.id,
    src: DEFAULT_MATCHDAY_AUDIO.src,
    volume: 0.42
  }
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      walletMode: null,
      embeddedAddress: null,
      activeAddress: null,
      profile: { username: "", displayName: "" },
      preferences: defaultPreferences,
      wallets: [],
      activities: [],
      invoices: [],
      setWalletMode: (walletMode) => set({ walletMode }),
      logout: () => set({ walletMode: null, activeAddress: null }),
      setEmbeddedAddress: (embeddedAddress) => set({ embeddedAddress, activeAddress: embeddedAddress }),
      setActiveAddress: (activeAddress) => set({ activeAddress }),
      upsertWallet: (wallet) =>
        set((state) => {
          const withoutWallet = state.wallets.filter((item) => item.address.toLowerCase() !== wallet.address.toLowerCase());
          const nextWallets = wallet.primary
            ? withoutWallet.map((item) => ({ ...item, primary: false }))
            : withoutWallet;
          return { wallets: [...nextWallets, wallet] };
        }),
      removeWallet: (address) =>
        set((state) => ({
          wallets: state.wallets.filter((wallet) => wallet.address.toLowerCase() !== address.toLowerCase()),
          activeAddress: state.activeAddress?.toLowerCase() === address.toLowerCase() ? null : state.activeAddress
        })),
      setPrimaryWallet: (address) =>
        set((state) => ({
          wallets: state.wallets.map((wallet) => ({ ...wallet, primary: wallet.address.toLowerCase() === address.toLowerCase() })),
          activeAddress: address
        })),
      updateProfile: (profile) => set((state) => ({ profile: { ...state.profile, ...profile } })),
      updatePreferences: (preferences) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            ...preferences,
            notifications: { ...state.preferences.notifications, ...(preferences.notifications ?? {}) },
            privacy: { ...state.preferences.privacy, ...(preferences.privacy ?? {}) },
            security: { ...state.preferences.security, ...(preferences.security ?? {}) },
            audio: { ...state.preferences.audio, ...(preferences.audio ?? {}) }
          }
        })),
      addActivity: (activity) =>
        {
          const created: Activity = {
            ...activity,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString()
          };
          set((state) => ({
            activities: [created, ...state.activities]
          }));
          return created;
        },
      updateActivity: (id, activity) =>
        set((state) => ({
          activities: state.activities.map((item) => (item.id === id ? { ...item, ...activity } : item))
        })),
      addInvoice: (invoice) => {
        const id = crypto.randomUUID().slice(0, 10);
        const createdAt = new Date().toISOString();
        const paymentLink = typeof window === "undefined" ? `/pay/${id}` : `${window.location.origin}/pay/${id}`;
        const nextInvoice: Invoice = { ...invoice, id, paymentLink, createdAt, status: "open" };
        set((state) => ({ invoices: [nextInvoice, ...state.invoices] }));
        get().addActivity({
          type: "invoice",
          title: "Invoice created",
          detail: `${invoice.amount} ${invoice.token} requested`,
          status: "confirmed"
        });
        return nextInvoice;
      }
    }),
    {
      name: "arc-one-state",
      version: 2,
      merge: (persisted, current) => {
        const next = persisted as Partial<AppState> | undefined;
        return {
          ...current,
          ...next,
          profile: { ...current.profile, ...(next?.profile ?? {}) },
          preferences: {
            ...current.preferences,
            ...(next?.preferences ?? {}),
            notifications: { ...current.preferences.notifications, ...(next?.preferences?.notifications ?? {}) },
            privacy: { ...current.preferences.privacy, ...(next?.preferences?.privacy ?? {}) },
            security: { ...current.preferences.security, ...(next?.preferences?.security ?? {}) },
            audio: { ...current.preferences.audio, ...(next?.preferences?.audio ?? {}) }
          }
        };
      },
      partialize: (state) => ({
        walletMode: state.walletMode,
        embeddedAddress: state.embeddedAddress,
        activeAddress: state.activeAddress,
        profile: state.profile,
        preferences: state.preferences,
        wallets: state.wallets,
        activities: state.activities,
        invoices: state.invoices
      })
    }
  )
);
