import { Router } from 'express';
import 'dotenv/config';

const router = Router();

// Calling Neynar's REST API directly rather than through the SDK - the SDK's
// fetchBulkUsersByEthOrSolAddress method was hitting a 404, likely a
// version mismatch between the installed SDK and Neynar's current API shape.
router.get('/:ethAddress', async (req, res) => {
  const { ethAddress } = req.params;

  if (!process.env.NEYNAR_API_KEY) {
    return res.status(500).json({ error: 'NEYNAR_API_KEY not set in .env' });
  }

  try {
    const url = `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${ethAddress}`;
    const response = await fetch(url, {
      headers: {
        'x-api-key': process.env.NEYNAR_API_KEY,
        'x-neynar-experimental': 'false',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (response.status === 404) {
      // Neynar returns 404 when the address has no associated Farcaster user
      return res.json({
        ethAddress, hasFarcasterAccount: false, solAddresses: [],
        note: 'no Farcaster account found for this address',
      });
    }

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Neynar responded ${response.status}: ${body.slice(0, 200)}`);
    }

    const data = await response.json();
    const users = data[ethAddress.toLowerCase()] || data[ethAddress] || [];
    const user = users[0];

    if (!user) {
      return res.json({
        ethAddress, hasFarcasterAccount: false, solAddresses: [],
        note: 'no Farcaster account found for this address',
      });
    }

    res.json({
      ethAddress,
      hasFarcasterAccount: true,
      fid: user.fid,
      username: user.username,
      solAddresses: user.verified_addresses?.sol_addresses || [],
      note: user.verified_addresses?.sol_addresses?.length
        ? null
        : 'Farcaster account found but no verified Solana address',
    });
  } catch (err) {
    console.error('[identity] lookup failed', err);
    res.status(502).json({ error: 'could not resolve Farcaster identity', detail: err.message });
  }
});

export default router;
