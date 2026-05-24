"use client";

import { X_LAYER_EXPLORER_URL, X_LAYER_MAINNET_CHAIN_ID, X_LAYER_MAINNET_RPC_URL, xLayerMainnet } from "@/lib/arc";

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export function getEthereumProvider() {
  if (typeof window === "undefined") {
    return null;
  }
  return window.ethereum ?? null;
}

function resolveProvider(provider?: EthereumProvider | null) {
  return provider ?? getEthereumProvider();
}

export function isUnknownChainError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    Number((error as { code: unknown }).code) === 4902
  );
}

export async function addArcNetwork(provider?: EthereumProvider | null) {
  const walletProvider = resolveProvider(provider);
  if (!walletProvider) {
    throw new Error("No EVM wallet provider was found.");
  }
  await walletProvider.request({
    method: "wallet_addEthereumChain",
    params: [
      {
        chainId: `0x${X_LAYER_MAINNET_CHAIN_ID.toString(16)}`,
        chainName: xLayerMainnet.name,
        rpcUrls: [X_LAYER_MAINNET_RPC_URL],
        nativeCurrency: xLayerMainnet.nativeCurrency,
        blockExplorerUrls: [X_LAYER_EXPLORER_URL]
      }
    ]
  });
}

export async function switchToArcNetwork(provider?: EthereumProvider | null) {
  const walletProvider = resolveProvider(provider);
  if (!walletProvider) {
    throw new Error("No EVM wallet provider was found.");
  }
  await walletProvider.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: `0x${X_LAYER_MAINNET_CHAIN_ID.toString(16)}` }]
  });
}

export type { EthereumProvider };
