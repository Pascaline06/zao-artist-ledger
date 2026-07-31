import { Router } from 'express';

const router = Router();

const WAVEWARZ_API = 'https://wavewarz-intelligence.vercel.app';
const CACHE_TTL_MS = 60 * 1000;

let artistCache = { data: null, fetchedAt: 0 };
let traderCache = { data: null, fetchedAt: 0 };

async function getArtistLeaderboard() {
  if (artistCache.data && Date.now() - artistCache.fetchedAt < CACHE_TTL_MS) return artistCache.data;
  const res = await fetch(`${WAVEWARZ_API}/api/public/leaderboards/artists?limit=500`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`WaveWarZ artists API responded ${res.status}`);
  const data = await res.json();
  artistCache = { data: data.artists || [], fetchedAt: Date.now() };
  return artistCache.data;
}

async function getTraderLeaderboard() {
  if (traderCache.data && Date.now() - traderCache.fetchedAt < CACHE_TTL_MS) return traderCache.data;
  const res = await fetch(`${WAVEWARZ_API}/api/public/leaderboards/traders?limit=500`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`WaveWarZ traders API responded ${res.status}`);
  const data = await res.json();
  traderCache = { data: data.traders || [], fetchedAt: Date.now() };
  return traderCache.data;
}

function matchesWallet(entryWallet, targetAddress) {
  if (!entryWallet) return false;
  if (entryWallet === targetAddress) return true;
  if (entryWallet.includes('...')) {
    const [prefix, suffix] = entryWallet.split('...');
    return targetAddress.startsWith(prefix) && targetAddress.endsWith(suffix);
  }
  return false;
}

// GET /api/wavewarz/:address - checks the artist leaderboard first (battle
// competitor), then falls back to the trader leaderboard (someone who bets
// on battles) - these are two different roles on WaveWarZ, and someone can
// be on one, both, or neither.
router.get('/:address', async (req, res) => {
  const { address } = req.params;

  try {
    const artists = await getArtistLeaderboard();
    const artistMatch = artists.find((a) => matchesWallet(a.wallet, address));

    if (artistMatch) {
      return res.json({
        address,
        found: true,
        role: 'artist',
        name: artistMatch.name,
        wins: artistMatch.wins,
        losses: artistMatch.losses,
        winRate: artistMatch.winRate,
        volumeSol: parseFloat(artistMatch.totalVolumeSol),
        earningsSol: parseFloat(artistMatch.totalEarningsSol),
        source: 'wavewarz-public-api',
        fetchedAt: new Date().toISOString(),
      });
    }

    const traders = await getTraderLeaderboard();
    const traderMatch = traders.find((t) => matchesWallet(t.wallet, address));

    if (traderMatch) {
      return res.json({
        address,
        found: true,
        role: 'trader',
        winRate: traderMatch.winRate,
        wins: traderMatch.wins,
        losses: traderMatch.losses,
        volumeSol: traderMatch.totalVolumeSol,
        netPnlSol: traderMatch.netPnlSol,
        battleCount: traderMatch.battleCount,
        source: 'wavewarz-public-api',
        fetchedAt: new Date().toISOString(),
      });
    }

    res.json({
      address, found: false,
      note: 'no WaveWarZ artist or trader match for this Solana wallet',
      source: 'wavewarz-public-api', fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[wavewarz] fetch failed', err);
    res.status(502).json({ error: 'could not reach WaveWarZ API', detail: err.message });
  }
});

export default router;
