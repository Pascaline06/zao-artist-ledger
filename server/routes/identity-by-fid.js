import { Router } from 'express';
import 'dotenv/config';

const router = Router();

// GET /api/identity-by-fid/:fid
// Given a Farcaster FID (available directly from Mini App context, unlike
// verified addresses which aren't included there), resolves it to the
// user's verified Ethereum and Solana addresses via Neynar.
router.get('/:fid', async (req, res) => {
  const { fid } = req.params;

  if (!process.env.NEYNAR_API_KEY) {
    return res.status(500).json({ error: 'NEYNAR_API_KEY not set' });
  }

  try {
    const url = `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`;
    const response = await fetch(url, {
      headers: { 'x-api-key': process.env.NEYNAR_API_KEY },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) throw new Error(`Neynar responded ${response.status}`);

    const data = await response.json();
    const user = data.users?.[0];

    if (!user) {
      return res.json({ fid, ethAddress: null, solAddresses: [], username: null });
    }

    res.json({
      fid,
      ethAddress: user.verified_addresses?.eth_addresses?.[0] || user.custody_address || null,
      solAddresses: user.verified_addresses?.sol_addresses || [],
      username: user.username || null,
    });
  } catch (err) {
    console.error('[identity-by-fid] lookup failed', err);
    res.status(502).json({ error: 'could not resolve identity from fid', detail: err.message });
  }
});

export default router;
