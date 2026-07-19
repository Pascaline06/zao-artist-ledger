import { Router } from 'express';

const router = Router();

// Real, documented, no-auth public API - confirmed live 2026-07-19.
// Replaces the earlier scraper stub entirely.
const WAVEWARZ_API = 'https://wavewarz-intelligence.vercel.app';

let cache = { artists: null, fetchedAt: 0 };
const CACHE_TTL_MS = 60 * 1000; // matches their own 30-60s server cache

async function getArtistLeaderboard() {
  if (cache.artists && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.artists;
  }
  const response = await fetch(`${WAVEWARZ_API}/api/public/leaderboards/artists?limit=500`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`WaveWarZ API responded ${response.status}`);
  const data = await response.json();
  cache = { artists: data.artists || [], fetchedAt: Date.now() };
  return cache.artists;
}

// Solana addresses are base58 and CASE-SENSITIVE - never lowercase these,
// unlike the Ethereum addresses used elsewhere in this app.
function matchesWallet(entryWallet, targetAddress) {
  if (!entryWallet) return false;
  if (entryWallet === targetAddress) return true;
  // Defensive fallback in case the API ever truncates wallets in responses
  // (docs example shows "23oq...GmG" style - unconfirmed if that's real or
  // just doc shorthand). Matches on the visible prefix/suffix around "...".
  if (entryWallet.includes('...')) {
    const [prefix, suffix] = entryWallet.split('...');
    return targetAddress.startsWith(prefix) && targetAddress.endsWith(suffix);
  }
  return false;
}

// GET /api/wavewarz/:address - address here is the artist's SOLANA wallet,
// not the Base/EVM address used for Respect and Empire Builder. The frontend
// needs to supply the right one - these are different chains entirely.
router.get('/:address', async (req, res) => {
  const { address } = req.params;

  try {
    const artists = await getArtistLeaderboard();
    const match = artists.find((a) => matchesWallet(a.wallet, address));

    if (!match) {
      return res.json({
        address, found: false,
        note: 'no WaveWarZ artist match for this Solana wallet',
        source: 'wavewarz-public-api', fetchedAt: new Date().toISOString(),
      });
    }

    res.json({
      address,
      found: true,
      name: match.name,
      wins: match.wins,
      losses: match.losses,
      winRate: match.winRate,
      volumeSol: parseFloat(match.totalVolumeSol),
      earningsSol: parseFloat(match.totalEarningsSol),
      source: 'wavewarz-public-api',
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[wavewarz] fetch failed', err);
    res.status(502).json({ error: 'could not reach WaveWarZ API', detail: err.message });
  }
});

export default router;
