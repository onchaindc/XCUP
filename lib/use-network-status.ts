"use client";

import { useMemo, useState } from "react";
import { useAccount, useChainId } from "wagmi";
import { X_LAYER_TESTNET_CHAIN_ID, xLayerTestnet } from "@/lib/arc";
import { addArcNetwork, switchToArcNetwork } from "@/lib/network";

export function useNetworkStatus() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const [busy, setBusy] = useState<"idle" | "adding" | "switching">("idle");
  const [networkError, setNetworkError] = useState("");
  const onArc = chainId === X_LAYER_TESTNET_CHAIN_ID;
  const wrongNetwork = isConnected && !onArc;

  const badge = useMemo(() => {
    if (!isConnected) {
      return { label: "Disconnected", tone: "muted" as const };
    }
    if (busy !== "idle") {
      return { label: "Connecting...", tone: "syncing" as const };
    }
    if (wrongNetwork) {
      return { label: "Wrong Network", tone: "danger" as const };
    }
    return { label: xLayerTestnet.name, tone: "good" as const };
  }, [busy, isConnected, wrongNetwork]);

  async function addNetwork() {
    setNetworkError("");
    setBusy("adding");
    try {
      await addArcNetwork();
      await switchToArcNetwork();
    } catch (error) {
      setNetworkError(error instanceof Error ? error.message : "Unable to add X Layer network.");
      throw error;
    } finally {
      setBusy("idle");
    }
  }

  async function switchNetwork() {
    setNetworkError("");
    setBusy("switching");
    try {
      await switchToArcNetwork();
    } catch (error) {
      setNetworkError(error instanceof Error ? error.message : "Unable to switch to X Layer.");
      throw error;
    } finally {
      setBusy("idle");
    }
  }

  return {
    chainId,
    onArc,
    wrongNetwork,
    syncing: busy !== "idle",
    busy,
    badge,
    networkError,
    addNetwork,
    switchNetwork
  };
}
