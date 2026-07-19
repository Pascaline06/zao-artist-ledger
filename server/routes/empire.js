import { Router } from 'express';
import 'dotenv/config';

const router = Router();

// Confirmed live 2026-07-19. www required - bare domain redirects to it.
const EMPIRE_API = 'https://www.empirebuilder.world';
const ZABAL_HOLDERS_LEADERBOARD_ID = 'a0f3b306-169b-4917-a1fa-5e3ea933fa71';

// The docs describe a per-address endpoint
// (/api/leaderboards/{id}/address/{addr}) but it's not actually deployed -
// confirmed via curl, it returns the site's real 404 page. This route
// instead fetches the full leaderboard (confirmed working) and filters
// for the address itself. Slightly more data transferred, but real.
let cache = { entries: null, fetchedAt: 0 };
const CACHE_TTL_MS = 5 * 60 * 1000;

async function getEntries() {
  if (cache.entries && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.entries;
  }
  const url = `${EMPIRE_API}/api/leaderboards/${ZABAL_HOLDERS_LEADERBOARD_ID}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Empire Builder responded ${response.status}`);
  const data = await response.json();
  cache = { entries: data.entries || [], fetchedAt: Date.now() };
  return cache.entries;
}

router.get('/:address', async (req, res) => {
  const { address } = req.params;

  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return res.status(400).json({ error: 'invalid address' });
  }

  try {
    const entries = await getEntries();
    const match = entries.find((e) => e.address?.toLowerCase() === address.toLowerCase());

    if (!match) {
      return res.json({
        address, rank: null, balance: null, found: false,
        note: 'address not on ZABAL holders leaderboard',
        source: 'empire-builder-api', fetchedAt: new Date().toISOString(),
      });
    }

    res.json({
      address,
      rank: match.rank ?? null,
      balance: match.score ?? null,
      farcasterUsername: match.farcaster_username ?? null,
      totalRewards: match.totalRewards ?? null,
      found: true,
      source: 'empire-builder-api',
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[empire] fetch failed', err);
    res.status(502).json({ error: 'could not reach Empire Builder API', detail: err.message });
  }
});

export default router;
