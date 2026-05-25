import { isAddress } from "viem";

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
  const configured = process.env.NEXT_PUBLIC_XCUP_CHALLENGE_VAULT_ADDRESS;
  return configured && isAddress(configured) ? (configured as `0x${string}`) : undefined;
}

export function usdcAddress() {
  const configured = process.env.NEXT_PUBLIC_X_LAYER_USDC_ADDRESS;
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
    outputs: [
      {
        name: "slips",
        type: "tuple[]",
        components: [
          { name: "id", type: "uint256" },
          { name: "player", type: "address" },
          { name: "matchId", type: "bytes32" },
          { name: "outcome", type: "uint8" },
          { name: "amount", type: "uint256" },
          { name: "asset", type: "uint8" },
          { name: "status", type: "uint8" },
          { name: "createdAt", type: "uint64" },
          { name: "lockDeadline", type: "uint64" },
          { name: "rewardClaimed", type: "bool" }
        ]
      }
    ]
  },
  {
    type: "function",
    name: "getMatchById",
    stateMutability: "view",
    inputs: [{ name: "matchId", type: "bytes32" }],
    outputs: [
      {
        name: "matchRecord",
        type: "tuple",
        components: [
          { name: "matchId", type: "bytes32" },
          { name: "metadataHash", type: "bytes32" },
          { name: "resolved", type: "bool" },
          { name: "result", type: "uint8" },
          { name: "lockDeadline", type: "uint64" }
        ]
      }
    ]
  },
  {
    type: "function",
    name: "vaultBalance",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "balance", type: "uint256" }]
  },
  {
    type: "function",
    name: "usdcVaultBalance",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "balance", type: "uint256" }]
  },
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "owner", type: "address" }]
  },
  {
    type: "function",
    name: "fundVault",
    stateMutability: "payable",
    inputs: [],
    outputs: []
  },
  {
    type: "function",
    name: "fundVaultUSDC",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "withdrawVault",
    stateMutability: "nonpayable",
    inputs: [
      { name: "asset", type: "uint8" },
      { name: "amount", type: "uint256" },
      { name: "to", type: "address" }
    ],
    outputs: []
  },
  {
    type: "event",
    name: "ChallengeCreated",
    inputs: [
      { name: "slipId", type: "uint256", indexed: true },
      { name: "player", type: "address", indexed: true },
      { name: "matchId", type: "bytes32", indexed: true },
      { name: "outcome", type: "uint8", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
      { name: "asset", type: "uint8", indexed: false }
    ]
  }
] as const;

export const erc20Abi = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ name: "success", type: "bool" }]
  }
] as const;
