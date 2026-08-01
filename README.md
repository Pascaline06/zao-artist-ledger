# ZAO Artist Value Ledger

Reads an artist's Respect (Optimism), Empire Builder standing (Base), and
WaveWarZ record (Solana - as either a battling artist or a trader), and
lets them mint a portable EAS attestation of that snapshot on Base -
something they can show a festival, sponsor, or label without anyone
needing to trust a screenshot.

Built for ZABAL Gamez Season 1, July open build.

**Live:** https://zao-artist-ledger.vercel.app
**Best experienced as a Farcaster Mini App** - open the link from inside
Warpcast or the Base app for automatic sign-in and full signing support.
Also works in a regular browser via Sign In With Farcaster or WalletConnect.

Tested live end-to-end by two real ZAO members with real on-chain data.

## What each part actually does

- **Respect (Optimism)** - reads OG Respect (ERC-20) and ZOR Respect
  (ERC-1155) balances directly on-chain, formatted using the token's real
  decimals (not the raw uint256).
- **Empire Builder** - checks all 5 real ZABAL leaderboards (holders,
  stakers, Farcaster-only holders, POIDH Submitters, Zabal Voting Miniapp)
  and surfaces every one an address appears on, not just token balance.
  Token holdings alone missed real contributors with no ZABAL in their
  wallet but real standing elsewhere (e.g. POIDH bounty rank).
- **WaveWarZ** - checks both the artist leaderboard (battle competitors)
  and the trader leaderboard (people who bet on battles), since these are
  two different roles on the platform and someone can be on either, both,
  or neither. Uses WaveWarZ's real public API, not a scraper.
- **Identity bridge (Base -> Solana)** - a Farcaster account can have both
  verified Ethereum/Base and Solana addresses. This app resolves both, so
  one Respect/Empire Builder check and one WaveWarZ check point at the
  same real person's two different wallets.
- **Three ways in:**
  - **Auto sign-in inside a real Farcaster Mini App** - if launched
    properly from a cast (not just opened as a plain link), the app
    detects the signed-in user via `sdk.context`, resolves their verified
    addresses through Neynar using their fid, and loads immediately -
    no extra approval needed for something already open inside Farcaster.
  - **Sign In With Farcaster (SIWF)** - for any other browser. Read-only
    identity proof via Farcaster's relay - no signer, no write access.
  - **Direct wallet connect** - for browsers with an injected wallet.
- **EAS attestation minting** - a real, registered schema on Base
  (`0x13e2d4d154c778e870ed74612ca4cbc746b14c4c57fbb7d3662a26e0609fd8a8`).
  Tries three signing paths in order: the Farcaster Mini App's own wallet,
  an injected wallet, then WalletConnect as a universal fallback.
- **Proof card** - after minting, shows a branded summary with a link to
  the full onchain attestation, not just a raw transaction hash.
- **Share to Farcaster** - composes a cast with the artist's real stats,
  embedding this app's own branded Mini App card (correct 3:2 aspect
  ratio - Farcaster crops anything else).

## Known gaps / honest limitations

- ZOR Respect reads use token id `0` - the real per-fractal-session token
  id scheme hasn't been confirmed against `fractalbotmarch2026`.
- WaveWarZ matching relies on the artist's Solana wallet being one of
  their Farcaster-verified addresses. Someone using a separate,
  unverified Solana wallet for WaveWarZ won't match - this happened in
  testing and turned out to be expected behavior, not a bug.
- Empire Builder's 5 checked leaderboards exclude one-off event boards
  (a sweepstakes, single-cast reactions) that aren't real standing
  signals. If ZAO adds new meaningful leaderboards, they need to be added
  to the list in `server/routes/empire.js` manually.
- No persistent cache - WaveWarZ/Empire Builder responses are cached
  in-memory only, reset on every redeploy. Fine at current scale.

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
guarded to only run outside Vercel's environment.

Required environment variables on Vercel: `NEYNAR_API_KEY`,
`EAS_SCHEMA_UID`, `WALLETCONNECT_PROJECT_ID`. RPC URLs and API endpoints
have safe defaults baked into the code.

## Structure                                                                     server/
index.js entry point, wires up routes
routes/
respect.js Optimism reads - OG Respect + ZOR Respect,
decimal-formatted
empire.js checks all 5 ZABAL leaderboards, returns every
match
wavewarz.js checks WaveWarZ artist AND trader leaderboards
(real public API)
identity.js Neynar - resolves a Base address to Farcaster
identity and verified Solana address(es)
identity-by-fid.js Neynar - resolves a fid (from Mini App context)
to verified addresses, for auto sign-in
siwf.js Sign In With Farcaster - channel creation +
polling
eas.js builds the attestation payload for client-side
signing
config.js exposes the WalletConnect project ID to the
frontend
lib/
chains.js viem clients + confirmed contract addresses
easSchema.js EAS schema definition + encoder
scripts/
register-schema.js one-time EAS schema registration (already run)
public/
index.html single-page frontend, Farcaster mini-app
manifest
style.css ZAO brand palette + fonts (locked)
app.js sign-in flows (auto + SIWF + direct wallet),
stat fetching, mint flow, share flow
assets/
embed-card.png 3:2 Farcaster embed image
logo.png 200x200 splash image


## License

MIT
