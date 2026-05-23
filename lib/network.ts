"use client";

import { X_LAYER_EXPLORER_URL, X_LAYER_TESTNET_CHAIN_ID, X_LAYER_TESTNET_RPC_URL, xLayerTestnet } from "@/lib/arc";

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

export async function addArcNetwork() {
  const provider = getEthereumProvider();
  if (!provider) {
    throw new Error("No EVM wallet provider was found.");
  }
  await provider.request({
    method: "wallet_addEthereumChain",
    params: [
      {
        chainId: `0x${X_LAYER_TESTNET_CHAIN_ID.toString(16)}`,
        chainName: xLayerTestnet.name,
        rpcUrls: [X_LAYER_TESTNET_RPC_URL],
        nativeCurrency: xLayerTestnet.nativeCurrency,
        blockExplorerUrls: [X_LAYER_EXPLORER_URL]
      }
    ]
  });
}

export async function switchToArcNetwork() {
  const provider = getEthereumProvider();
  if (!provider) {
    throw new Error("No EVM wallet provider was found.");
  }
  await provider.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: `0x${X_LAYER_TESTNET_CHAIN_ID.toString(16)}` }]
  });
}
