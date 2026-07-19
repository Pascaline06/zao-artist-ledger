import { Router } from 'express';
import 'dotenv/config';

const router = Router();

// In-memory cache. Swap for Supabase (ZAO's default DB) once this needs to
// survive restarts - see the nightly-sync note below.
let cache = { data: null, fetchedAt: null };
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

// GET /api/wavewarz/:address
// HONEST STATE: WaveWarZ has no public API. ZAO's own sync job
// (src/lib/wavewarz/scraper.ts in ZAOOS) scrapes wavewarz-intelligence.vercel.app
// nightly - this route does the same thing, on the same footing as the core team.
//
// The actual scraping logic below is a STUB. wavewarz-intelligence.vercel.app's
// DOM structure needs to be inspected directly (view-source or devtools) before
// this can extract real per-artist wins/volume - that step needs a live look at
// the page, which wasn't done here. Fill in the selectors, then this route works
// end to end.
router.get('/:address', async (req, res) => {
  const { address } = req.params;

  try {
    if (!cache.data || Date.now() - cache.fetchedAt > CACHE_TTL_MS) {
      cache = { data: await scrapeWaveWarZ(), fetchedAt: Date.now() };
    }

    const artistRow = cache.data.find(
      (row) => row.wallet?.toLowerCase() === address.toLowerCase()
    );

    if (!artistRow) {
      return res.json({
        address,
        found: false,
        note: 'no WaveWarZ wallet match - artist may use a different wallet for battles, or scraper selectors need updating',
        source: 'wavewarz-intelligence-scrape',
        fetchedAt: new Date(cache.fetchedAt).toISOString(),
      });
    }

    res.json({
      address,
      found: true,
      wins: artistRow.wins ?? null,
      volumeSol: artistRow.volumeSol ?? null,
      source: 'wavewarz-intelligence-scrape',
      fetchedAt: new Date(cache.fetchedAt).toISOString(),
    });
  } catch (err) {
    console.error('[wavewarz] scrape failed', err);
    res.status(502).json({ error: 'could not read WaveWarZ data', detail: err.message });
  }
});

async function scrapeWaveWarZ() {
  const url = process.env.WAVEWARZ_SOURCE_URL || 'https://wavewarz-intelligence.vercel.app';
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  const html = await response.text();

  // TODO: replace with real selectors once you've inspected the live page.
  // If the page is client-rendered (React/Next), a plain fetch won't see the
  // data - you'll likely need to hit an internal API route the page itself
  // calls (check the Network tab) rather than parsing HTML at all.
  void html;

  return []; // placeholder - no rows until the real extraction is wired up
}

export default router;
