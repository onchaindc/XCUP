import { isAddress } from "viem";

// STUB ABI: replace this with the deployed challenge contract ABI if function signatures differ.
export const ARENA_ASSET_DECIMALS = {
  OKB: 18,
  USDC: 6
} as const;

export const ARENA_OUTCOME_ID = {
  HOME: 0,
  DRAW: 1,
  AWAY: 2
} as const;

export const ARENA_ASSET_ID = {
  OKB: 0,
  USDC: 1
} as const;

export function arenaChallengeAddress() {
  const configured = process.env.NEXT_PUBLIC_XCUP_ARENA_ADDRESS;
  return configured && isAddress(configured) ? (configured as `0x${string}`) : undefined;
}

export const arenaChallengeAbi = [
  {
    type: "function",
    name: "lockChallenge",
    stateMutability: "payable",
    inputs: [
      { name: "matchId", type: "bytes32" },
      { name: "outcome", type: "uint8" },
      { name: "amount", type: "uint256" },
      { name: "asset", type: "uint8" }
    ],
    outputs: [{ name: "slipId", type: "uint256" }]
  },
  {
    type: "function",
    name: "exitChallenge",
    stateMutability: "nonpayable",
    inputs: [{ name: "slipId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "claimReward",
    stateMutability: "nonpayable",
    inputs: [{ name: "slipId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "getUserSlips",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "slips", type: "bytes[]" }]
  },
  {
    type: "function",
    name: "getMatchById",
    stateMutability: "view",
    inputs: [{ name: "matchId", type: "bytes32" }],
    outputs: [{ name: "metadata", type: "bytes" }]
  },
  {
    type: "function",
    name: "vaultBalance",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "balance", type: "uint256" }]
  }
] as const;
