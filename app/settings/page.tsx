"use client";

import { useRef, useState } from "react";
import { formatUnits } from "viem";
import { useAccount, useBalance, useConnect, useDisconnect } from "wagmi";
import { KickoffLoader, TopHeader } from "@/components/XCupApp";
import { SettingsTab } from "@/components/ProfilePage";
import { useAppStore } from "@/lib/app-store";
import { xLayerTestnet } from "@/lib/arc";
import { errorMessage } from "@/lib/utils";
import { pickWalletConnector } from "@/lib/wallet";

export default function SettingsPage() {
  const [showLoader, setShowLoader] = useState(true);
  const [walletError, setWalletError] = useState("");
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);
  const profile = useAppStore((state) => state.profile);
  const preferences = useAppStore((state) => state.preferences);
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
        <section className="mb-4 rounded-lg border border-white/10 bg-black p-4 sm:p-6">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Settings</p>
          <h1 className="mt-2 text-3xl font-black text-white sm:text-5xl">App controls</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/62">Manage profile, notifications, privacy, appearance, music, wallet approvals, and saved sessions from one place.</p>
        </section>
        <SettingsTab
          profile={profile}
          preferences={preferences}
          updateProfile={updateProfile}
          updatePreferences={updatePreferences}
          avatarInputRef={avatarInputRef}
          bannerInputRef={bannerInputRef}
          uploadProfileImage={uploadProfileImage}
        />
      </div>
    </main>
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
