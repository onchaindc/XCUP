import fs from "node:fs";
import path from "node:path";
import solc from "solc";
import { createPublicClient, createWalletClient, defineChain, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const root = process.cwd();
const envPath = path.join(root, ".env.local");

if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }
    const [key, ...valueParts] = trimmed.split("=");
    if (!process.env[key]) {
      process.env[key] = valueParts.join("=").replace(/^["']|["']$/g, "");
    }
  }
}

const rpcUrl = process.env.X_LAYER_RPC_URL || process.env.NEXT_PUBLIC_X_LAYER_RPC_URL || "https://rpc.xlayer.tech";
const explorerUrl = process.env.NEXT_PUBLIC_X_LAYER_EXPLORER_URL || "https://www.okx.com/web3/explorer/xlayer";
const privateKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY;

if (process.env.CONFIRM_MAINNET_DEPLOY !== "YES") {
  throw new Error("This deploys to X Layer mainnet with real OKB. Set CONFIRM_MAINNET_DEPLOY=YES to continue.");
}

if (!privateKey) {
  throw new Error("Set DEPLOYER_PRIVATE_KEY in .env.local or in your shell before running npm run deploy:xlayer.");
}

const normalizedPrivateKey = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
const sourcePath = path.join(root, "contracts", "XCupArena.sol");
const source = fs.readFileSync(sourcePath, "utf8");

const input = {
  language: "Solidity",
  sources: {
    "XCupArena.sol": {
      content: source
    }
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 200
    },
    outputSelection: {
      "*": {
        "*": ["abi", "evm.bytecode.object"]
      }
    }
  }
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));
const errors = output.errors?.filter((item) => item.severity === "error") ?? [];

if (errors.length) {
  throw new Error(errors.map((item) => item.formattedMessage).join("\n"));
}

const contract = output.contracts["XCupArena.sol"].XCupArena;
const abi = contract.abi;
const bytecode = `0x${contract.evm.bytecode.object}`;
const account = privateKeyToAccount(normalizedPrivateKey);

const xLayerMainnet = defineChain({
  id: 196,
  name: "X Layer",
  nativeCurrency: {
    name: "OKB",
    symbol: "OKB",
    decimals: 18
  },
  rpcUrls: {
    default: {
      http: [rpcUrl]
    }
  },
  blockExplorers: {
    default: {
      name: "OKX Explorer",
      url: explorerUrl
    }
  }
});

const transport = http(rpcUrl);
const publicClient = createPublicClient({
  chain: xLayerMainnet,
  transport
});
const walletClient = createWalletClient({
  account,
  chain: xLayerMainnet,
  transport
});

console.log(`Deploying XCupArena from ${account.address} to X Layer mainnet...`);

const hash = await walletClient.deployContract({
  abi,
  bytecode,
  account
});

console.log(`Tx: ${hash}`);

const receipt = await publicClient.waitForTransactionReceipt({ hash });

if (!receipt.contractAddress) {
  throw new Error("Deployment transaction mined, but no contract address was returned.");
}

console.log(`Contract: ${receipt.contractAddress}`);
console.log(`Explorer: ${explorerUrl}/address/${receipt.contractAddress}`);
console.log("");
console.log("Add this to .env.local and your hosting env vars:");
console.log(`NEXT_PUBLIC_XCUP_ARENA_ADDRESS=${receipt.contractAddress}`);
