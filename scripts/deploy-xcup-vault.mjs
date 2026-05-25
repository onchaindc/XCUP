import fs from "node:fs";
import path from "node:path";
import solc from "solc";
import { createPublicClient, createWalletClient, defineChain, http, isAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const root = process.cwd();
const envPath = path.join(root, ".env.local");

if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...valueParts] = trimmed.split("=");
    if (!process.env[key]) process.env[key] = valueParts.join("=").replace(/^["']|["']$/g, "");
  }
}

if (process.env.CONFIRM_MAINNET_DEPLOY !== "YES") {
  throw new Error("This deploys XCupChallengeVault to X Layer mainnet. Set CONFIRM_MAINNET_DEPLOY=YES to continue.");
}

const privateKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
if (!privateKey) throw new Error("Set DEPLOYER_PRIVATE_KEY before deploying.");

const usdc = process.env.X_LAYER_USDC_ADDRESS || process.env.NEXT_PUBLIC_X_LAYER_USDC_ADDRESS;
if (!usdc || !isAddress(usdc)) throw new Error("Set X_LAYER_USDC_ADDRESS to the X Layer mainnet USDC contract address.");

const resolver = process.env.XCUP_RESOLVER_ADDRESS || "0x0000000000000000000000000000000000000000";
if (!isAddress(resolver)) throw new Error("XCUP_RESOLVER_ADDRESS must be an EVM address.");

const rpcUrl = process.env.X_LAYER_RPC_URL || "https://rpc.xlayer.tech";
const explorerUrl = process.env.NEXT_PUBLIC_X_LAYER_EXPLORER_URL || "https://www.okx.com/web3/explorer/xlayer";
const sourcePath = path.join(root, "contracts", "XCupChallengeVault.sol");
const source = fs.readFileSync(sourcePath, "utf8");
const input = {
  language: "Solidity",
  sources: { "XCupChallengeVault.sol": { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } }
  }
};
const output = JSON.parse(solc.compile(JSON.stringify(input)));
const errors = output.errors?.filter((item) => item.severity === "error") ?? [];
if (errors.length) throw new Error(errors.map((item) => item.formattedMessage).join("\n"));

const contract = output.contracts["XCupChallengeVault.sol"].XCupChallengeVault;
const account = privateKeyToAccount(privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`);
const xLayerMainnet = defineChain({
  id: 196,
  name: "X Layer",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: { default: { http: [rpcUrl] } },
  blockExplorers: { default: { name: "OKX Explorer", url: explorerUrl } }
});
const transport = http(rpcUrl);
const publicClient = createPublicClient({ chain: xLayerMainnet, transport });
const walletClient = createWalletClient({ account, chain: xLayerMainnet, transport });

console.log(`Deploying XCupChallengeVault from ${account.address}...`);
const hash = await walletClient.deployContract({
  abi: contract.abi,
  bytecode: `0x${contract.evm.bytecode.object}`,
  args: [usdc, resolver],
  account
});
console.log(`Tx: ${hash}`);
const receipt = await publicClient.waitForTransactionReceipt({ hash });
if (!receipt.contractAddress) throw new Error("No contract address returned.");
console.log(`Contract: ${receipt.contractAddress}`);
console.log(`Explorer: ${explorerUrl}/address/${receipt.contractAddress}`);
console.log("");
console.log("Add these to .env.local and Vercel:");
console.log(`NEXT_PUBLIC_XCUP_CHALLENGE_VAULT_ADDRESS=${receipt.contractAddress}`);
console.log(`NEXT_PUBLIC_X_LAYER_USDC_ADDRESS=${usdc}`);
