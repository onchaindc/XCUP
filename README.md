# X Cup Arena

X Cup Arena is a World Cup-themed onchain arena for X Layer. It combines live prediction markets, matchday GameFi, squads, NFT/proof rails, and AI match agents into one mobile-first product.

## What it does

- live-only prediction cards for real in-play sports events
- dedicated squads tab with create/join flows, roles, ELO, treasury, wars, territory, and reputation loops
- mini GameFi loops for fantasy lineup selection and penalty duels
- dedicated AI Agent tab for tactical signal, risk, and settlement briefings
- optional X Layer testnet prediction writes when `NEXT_PUBLIC_XCUP_ARENA_ADDRESS` is configured

## X Layer

The app is wired to X Layer testnet primitives:

- Chain ID: `1952`
- RPC: `https://testrpc.xlayer.tech/terigon`
- Explorer: `https://www.okx.com/web3/explorer/xlayer-test`

Set `NEXT_PUBLIC_XCUP_ARENA_ADDRESS` to the deployed contract address to submit live predictions to X Layer testnet. Without it, predictions still work as in-app session picks while keeping the UI demo-ready.

## Contract scaffold

[`contracts/XCupArena.sol`](./contracts/XCupArena.sol) is the minimal onchain scaffold for:

- recording prediction tickets
- tracking squad joins
- recording agent briefings

It is intentionally small so it can be deployed during the hackathon and referenced from the UI.

## Run

```bash
npm install
npm run dev
```

For the most stable demo server:

```bash
npm run build
npx next start -H 127.0.0.1 -p 3000
```

## Validate

```bash
npm run typecheck
npm run build
```

## Notes

- The first screen is a custom loader inspired by a football strike into goalpost geometry.
- The UI is intentionally dark, dense, and minimal to stay close to the OKX / X Layer visual language.
- Markets use live ESPN scoreboard feeds only; no mock fixtures are rendered as prediction markets.
- Live score refreshes preserve the current board instead of blanking the screen.
- Madrid, Barcelona, Arsenal, and Manchester City live fixtures receive priority ranking when present in the live feed.
- The app targets X Layer testnet for hackathon demos. Mainnet should come after judging, audits, and real liquidity/oracle decisions.
