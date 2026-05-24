"use client";

import { useMemo, useState } from "react";
import { useAccount, useChainId } from "wagmi";
import { ARC_CHAIN_ID, xLayerMainnet } from "@/lib/arc";
import { addArcNetwork, isUnknownChainError, switchToArcNetwork, type EthereumProvider } from "@/lib/network";
import { errorMessage } from "@/lib/utils";

export function useNetworkStatus() {
  const { connector, isConnected } = useAccount();
  const chainId = useChainId();
  const [busy, setBusy] = useState<"idle" | "adding" | "switching">("idle");
  const [networkError, setNetworkError] = useState("");
  const [networkNotice, setNetworkNotice] = useState("");
  const onArc = chainId === ARC_CHAIN_ID;
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
    return { label: xLayerMainnet.name, tone: "good" as const };
  }, [busy, isConnected, wrongNetwork]);

  async function getWalletProvider() {
    return connector ? ((await connector.getProvider()) as EthereumProvider) : null;
  }

  async function addNetwork() {
    setNetworkError("");
    setNetworkNotice("");
    setBusy("adding");
    try {
      const provider = await getWalletProvider();
      await addArcNetwork(provider);
      await switchToArcNetwork(provider);
      setNetworkNotice("X Layer mainnet RPC added.");
    } catch (error) {
      setNetworkError(errorMessage(error, "Unable to add X Layer network."));
    } finally {
      setBusy("idle");
    }
  }

  async function switchNetwork() {
    setNetworkError("");
    setNetworkNotice("");
    setBusy("switching");
    try {
      const provider = await getWalletProvider();
      try {
        await switchToArcNetwork(provider);
      } catch (error) {
        if (!isUnknownChainError(error)) {
          throw error;
        }
        await addArcNetwork(provider);
        await switchToArcNetwork(provider);
      }
      setNetworkNotice("Switched to X Layer mainnet.");
    } catch (error) {
      setNetworkError(errorMessage(error, "Unable to switch to X Layer."));
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
    networkNotice,
    addNetwork,
    switchNetwork
  };
}
