# ZAO Artist Value Ledger

Reads an artist's Respect (Optimism), Empire Builder standing (Base), and
WaveWarZ battle record (Solana, via scrape), and lets them mint a portable
EAS attestation of that snapshot on Base - something they can show a
festival, sponsor, or label without anyone needing to trust a screenshot.

Built for ZABAL Gamez Season 1, July open build.

## Honest state of this scaffold

This is a working skeleton, not a finished build. Specifically:

- **Respect reads (Optimism)** - real, should work as-is against the
  confirmed contract addresses. Note: ZOR Respect reads token id `0` only;
  confirm the real token-id scheme against `fractalbotmarch2026` before
  trusting this as complete.
- **Empire Builder reads** - real endpoint shape, but the exact JSON fields
  Empire Builder returns weren't verified live. Check the response against
  `empire-builder.gitbook.io/empire-builder-docs` and adjust the field
  mapping in `server/routes/empire.js` if it doesn't match.
- **WaveWarZ reads** - honestly a stub. There's no public API (ZAO's own
  team scrapes the same dashboard). `scrapeWaveWarZ()` in
  `server/routes/wavewarz.js` needs real selectors written against the live
  page - inspect `wavewarz-intelligence.vercel.app` directly first.
- **EAS attestation** - the schema, encoding, and prepare-endpoint are real.
  The actual client-side signing call in `public/app.js` (`mintAttestation`)
  is NOT wired to a live wallet yet - that needs testing against a real
  Farcaster or browser wallet session before this button actually mints
  anything.

Treat this as hour 1-2 of the 24-hour build, not a finished submission.

## Setup

```bash
npm install
cp .env.example .env
# fill in .env - see comments in the file for what each key is for
```

One-time: register the EAS schema (needs a small amount of Base ETH for gas):

```bash
node scripts/register-schema.js
# copy the printed schemaUID into .env as EAS_SCHEMA_UID
```

Run the server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Structure

```
server/
  index.js          entry point, wires up routes
  routes/
    respect.js       Optimism reads - OG Respect + ZOR Respect
    empire.js        Empire Builder proxy
    wavewarz.js       WaveWarZ scrape (stub - needs real selectors)
    eas.js            builds the attestation payload for client-side signing
  lib/
    chains.js         viem clients + confirmed contract addresses
    easSchema.js       EAS schema definition + encoder
scripts/
  register-schema.js  one-time EAS schema registration
public/
  index.html           single-page frontend, Farcaster mini-app manifest
  style.css            ZAO brand palette + fonts (locked, don't improvise colors)
  app.js               wallet connect, stat fetching, mint flow
```

## Next steps (in rough priority order)

1. Inspect `wavewarz-intelligence.vercel.app` live and write real scraping
   logic (or find its internal API if the page is client-rendered).
2. Test the Empire Builder response shape against a real address and fix
   field names if they don't match.
3. Wire and test the actual EAS `attest()` call in `mintAttestation()`
   against a live wallet - this is the one part that hasn't touched a real
   signer yet.
4. Confirm the ZOR Respect token-id scheme - token id `0` is a guess, not
   confirmed against the actual minting contract.
5. Swap the WaveWarZ in-memory cache for Supabase if this needs to survive
   restarts (matches ZAO's default DB choice).

## License

MIT
