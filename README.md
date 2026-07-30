# ZAO Artist Value Ledger

Reads an artist's Respect (Optimism), Empire Builder standing (Base), and
WaveWarZ battle record (Solana), and lets them mint a portable EAS
attestation of that snapshot on Base - something they can show a festival,
sponsor, or label without anyone needing to trust a screenshot.

Built for ZABAL Gamez Season 1, July open build.

**Live:** https://zao-artist-ledger.vercel.app
**Best experienced as a Farcaster Mini App** - open the link from inside
Warpcast or the Base app for full wallet sign-in and signing support. It
also works in a regular browser via WalletConnect.

## Current state - everything below is real and tested live

- **Respect (Optimism)** - reads OG Respect (ERC-20) and ZOR Respect
  (ERC-1155) balances directly on-chain. One known gap: ZOR reads use
  token id `0` - the real per-fractal-session token id scheme hasn't been
  confirmed against `fractalbotmarch2026`.
- **Empire Builder** - reads the real ZABAL holders leaderboard
  (`empirebuilder.world`, confirmed live). Rank, balance, and rewards pulled
  from actual leaderboard entries, not a guessed endpoint.
- **WaveWarZ** - uses WaveWarZ's real public API
  (`wavewarz-intelligence.vercel.app/api/public/...`), not a scraper. Wins,
  losses, and volume are live numbers.
- **Identity bridge (Base -> Solana)** - a Farcaster account can have both a
  verified Ethereum/Base address and a verified Solana address. This app
  resolves both so one Respect/Empire Builder check and one WaveWarZ check
  can point at the same real person's two different wallets.
- **Two sign-in paths:**
  - **Sign In With Farcaster (SIWF)** - read-only identity proof via
    Farcaster's relay, no signer, no write access. Works from any browser.
  - **Direct wallet connect** - for browsers with an injected wallet
    (MetaMask, Coinbase Wallet's own browser, etc).
- **EAS attestation minting** - a real, registered schema on Base
  (`0x13e2d4d154c778e870ed74612ca4cbc746b14c4c57fbb7d3662a26e0609fd8a8`).
  Minting tries three signing paths in order: the Farcaster Mini App's own
  wallet (when launched properly inside Warpcast/Base app), an injected
  wallet, then WalletConnect as a universal fallback for any browser.
- **Proof card** - after minting, shows a branded summary (not just a raw
  transaction hash) with a link to the full onchain attestation.
- **Share to Farcaster** - composes a cast with the artist's real stats and
  a link to the attestation, embedding this app's own branded Mini App card.

## Known gaps / honest limitations

- ZOR Respect token-id assumption (see above) - untested against real
  per-session token ids.
- Empire Builder result only checks the "ZABAL holders" leaderboard - an
  artist ranked only on a different leaderboard (stakers, Farcaster-only,
  etc.) won't show up. Swappable in `server/routes/empire.js`.
- WaveWarZ matching relies on the artist's Solana wallet being one of their
  Farcaster-verified addresses - an artist using a separate, unverified
  Solana wallet for WaveWarZ won't match.
- No persistent cache (WaveWarZ/Empire Builder responses are cached
  in-memory only) - resets on every redeploy. Fine at current scale; would
  need Supabase or similar if this grows.

## Setup

```bash
npm install
cp .env.example .env
# fill in .env - see comments in the file for what each key is for
```

One-time, already done for the live deployment (only needed again if
forking this and registering a new schema):

```bash
node scripts/register-schema.js
# copy the printed schemaUID into .env as EAS_SCHEMA_UID
```

Run locally:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Deployment

Deployed on Vercel. `vercel.json` routes all requests through
`server/index.js` as a single serverless function; `app.listen()` is
guarded to only run outside Vercel's environment (see bottom of
`server/index.js`).

Required environment variables on Vercel: `NEYNAR_API_KEY`,
`EAS_SCHEMA_UID`, `WALLETCONNECT_PROJECT_ID`. RPC URLs and API endpoints
have safe defaults baked into the code.

## Structure                                                                     server/
index.js entry point, wires up routes
routes/
respect.js Optimism reads - OG Respect + ZOR Respect
empire.js Empire Builder leaderboard reads (real API)
wavewarz.js WaveWarZ public API reads (real API, not a scraper)
identity.js Neynar - resolves a Base address to Farcaster identity
and any verified Solana address(es)
siwf.js Sign In With Farcaster - channel creation + polling
eas.js builds the attestation payload for client-side signing
config.js exposes the WalletConnect project ID to the frontend
lib/
chains.js viem clients + confirmed contract addresses
easSchema.js EAS schema definition + encoder
scripts/
register-schema.js one-time EAS schema registration (already run)
public/
index.html single-page frontend, Farcaster mini-app manifest
style.css ZAO brand palette + fonts (locked, don't improvise colors)
app.js sign-in flows, stat fetching, mint flow, share flow
assets/
embed-card.png 3:2 Farcaster embed image
logo.png 200x200 splash image


## License

MIT
