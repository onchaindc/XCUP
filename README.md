# X Cup Edition

X Cup Edition is a World Cup-themed onchain arena for X Layer. It combines prediction markets, SocialFi fan rooms, NFTs, GameFi loops, and AI match agents into one mobile-first product.

## What it does

- prediction cards for match outcomes and side quests
- squad/social posts that turn match traffic into shareable onchain activity
- dynamic NFT mint intents for passes, badges, and relics
- mini GameFi loops for streaks and matchday engagement
- AI agent briefings that explain signal, risk, and growth angles
- proof rail that records payload hashes and demo-ready verifiability

## X Layer

The app is wired to X Layer testnet primitives:

- Chain ID: `1952`
- RPC: `https://testrpc.xlayer.tech/terigon`
- Explorer: `https://www.okx.com/web3/explorer/xlayer-test`

Set `NEXT_PUBLIC_XCUP_ARENA_ADDRESS` to the deployed contract address to make the proof lane point at a live deployment.

## Contract scaffold

[`contracts/XCupArena.sol`](./contracts/XCupArena.sol) is the minimal onchain scaffold for:

- recording prediction tickets
- tracking squad joins
- recording mint intents
- recording agent briefings

It is intentionally small so it can be deployed during the hackathon and referenced from the UI.

## Run

```bash
npm install
npm run dev
```

## Validate

```bash
npm run typecheck
npm run build
```

## Notes

- The first screen is a custom loader inspired by a football strike into goalpost geometry.
- The UI is intentionally dark, dense, and minimal to stay close to the OKX / X Layer visual language.
- The app currently prepares verifiable payloads locally and is ready to point to a deployed X Layer contract.
