import { Router } from 'express';

const router = Router();

const EMPIRE_API = 'https://www.empirebuilder.world';

// All 5 confirmed real via direct API pull against ZABAL's token address.
// Excludes one-off event leaderboards (a sweepstakes, single-cast reactions)
// that aren't meaningful standing signals.
const LEADERBOARDS = [
  { id: 'a0f3b306-169b-4917-a1fa-5e3ea933fa71', label: 'ZABAL holders' },
  { id: '7b8d2725-2297-4ad5-8156-0c4c09605ced', label: 'ZABAL stakers' },
  { id: '709d1f03-a5c3-467a-bc69-2af441c581f6', label: 'ZABAL (Farcaster Only)' },
  { id: '7b8e8dfa-529d-48ad-8c9b-bdb45cc35187', label: 'POIDH Submitters' },
  { id: '5501171d-cf65-4fc0-8551-691628d6f0cd', label: 'Zabal Voting Miniapp' },
];

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = {}; // { [id]: { entries, fetchedAt } }

async function getEntries(id) {
  if (cache[id] && Date.now() - cache[id].fetchedAt < CACHE_TTL_MS) {
    return cache[id].entries;
  }
  const url = `${EMPIRE_API}/api/leaderboards/${id}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Empire Builder responded ${response.status}`);
  const data = await response.json();
  cache[id] = { entries: data.entries || [], fetchedAt: Date.now() };
  return cache[id].entries;
}

// GET /api/empire/:address
// Checks all 5 ZABAL leaderboards and returns every one this address
// appears on - not just token-holding rank, since that alone can miss
// real contributors who hold little or no ZABAL personally.
router.get('/:address', async (req, res) => {
  const { address } = req.params;

  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return res.status(400).json({ error: 'invalid address' });
  }

  try {
    const results = await Promise.all(
      LEADERBOARDS.map(async ({ id, label }) => {
        try {
          const entries = await getEntries(id);
          const match = entries.find((e) => e.address?.toLowerCase() === address.toLowerCase());
          return match ? { label, rank: match.rank, score: match.score } : null;
        } catch (err) {
          console.error(`[empire] leaderboard ${label} failed`, err);
          return null;
        }
      })
    );

    const matches = results.filter(Boolean);

    res.json({
      address,
      found: matches.length > 0,
      rankings: matches,
      // Keep a single best "rank" for simple display - lowest number across
      // whichever boards this address appears on.
      rank: matches.length ? Math.min(...matches.map((m) => m.rank)) : null,
      source: 'empire-builder-api',
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[empire] fetch failed', err);
    res.status(502).json({ error: 'could not reach Empire Builder API', detail: err.message });
  }
});

export default router;
