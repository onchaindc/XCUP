import { defineChain } from "viem";

export const X_LAYER_MAINNET_CHAIN_ID = 196;
export const X_LAYER_TESTNET_CHAIN_ID = 1952;
export const X_LAYER_MAINNET_RPC_URL = "https://rpc.xlayer.tech";
export const X_LAYER_TESTNET_RPC_URL = "https://testrpc.xlayer.tech/terigon";
export const X_LAYER_EXPLORER_URL = "https://www.okx.com/web3/explorer/xlayer-test";

export const xLayerTestnet = defineChain({
  id: X_LAYER_TESTNET_CHAIN_ID,
  name: "X Layer testnet",
  nativeCurrency: {
    decimals: 18,
    name: "OKB",
    symbol: "OKB"
  },
  rpcUrls: {
    default: {
      http: [X_LAYER_TESTNET_RPC_URL],
      webSocket: ["wss://xlayerws.okx.com"]
    }
  },
  blockExplorers: {
    default: {
      name: "OKX Explorer",
      url: X_LAYER_EXPLORER_URL
    }
  },
  testnet: true
});

export const arcTestnet = xLayerTestnet;
export const ARC_CHAIN_ID = X_LAYER_TESTNET_CHAIN_ID;
export const ARC_RPC_URL = X_LAYER_TESTNET_RPC_URL;
export const ARC_EXPLORER_URL = X_LAYER_EXPLORER_URL;

export type ArcSendParams = {
  to: string;
  amount: string;
  token: "OKB" | "USDT" | "USDC" | "ETH";
};

export type ArcSwapParams = {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
};

export async function createArcAppKit() {
  return {
    chain: xLayerTestnet,
    rpcUrl: X_LAYER_TESTNET_RPC_URL,
    mode: "mock-x-layer-sdk",
    features: ["wallets", "predictions", "social", "nfts", "games", "agents"]
  };
}

export async function getArcSwapQuote({ tokenIn, tokenOut, amountIn }: ArcSwapParams) {
  const amount = Number(amountIn || 0);

  return {
    amountOut: amount > 0 && tokenIn === tokenOut ? amount.toString() : "",
    fee: "Unavailable",
    route: `${tokenIn} -> X Layer liquidity -> ${tokenOut}`,
    executable: false,
    reason:
      "X Cup is connected to X Layer testnet RPC, but no production swap router contract is configured yet. Execution is disabled until a verified router address is added.",
    poweredBy: "X Layer testnet RPC"
  };
}
