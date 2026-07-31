import { Router } from 'express';
import { createAppClient, viemConnector } from '@farcaster/auth-client';
import 'dotenv/config';

const router = Router();

const appClient = createAppClient({
  relay: 'https://relay.farcaster.xyz',
  ethereum: viemConnector(),
});

// POST /api/siwf/create-channel
// Starts a Sign In With Farcaster session. Returns a URL - on mobile this
// deep-links straight into the Farcaster app for approval; on desktop it's
// meant to be shown as a QR code. Read-only: no signer, no write access.
router.post('/create-channel', async (req, res) => {
  try {
    const { url, domain } = getOrigin(req);
    const { data, isError, error } = await appClient.createChannel({
      siweUri: `${url}/login`,
      domain,
    });

    if (isError) throw error;

    res.json({ channelToken: data.channelToken, url: data.url });
  } catch (err) {
    console.error('[siwf] createChannel failed', err);
    res.status(502).json({ error: 'could not start Farcaster sign-in', detail: err.message });
  }
});

// GET /api/siwf/status/:channelToken
// Poll this until state is "completed". Verifies the signed message
// server-side before trusting the returned fid/custody address.
router.get('/status/:channelToken', async (req, res) => {
  try {
    const { data, isError, error } = await appClient.status({
      channelToken: req.params.channelToken,
    });

    if (isError) throw error;

    console.log('[siwf] raw status data:', JSON.stringify(data));

    if (data.state !== 'completed') {
      return res.json({ state: data.state });
    }

    res.json({
      state: 'completed',
      fid: data.fid,
      custody: data.custody,
      verifications: data.verifications || [],
    });
  } catch (err) {
    console.error('[siwf] status check failed', err);
    res.status(502).json({ error: 'could not check sign-in status', detail: err.message });
  }
});

function getOrigin(req) {
  const host = req.get('host');
  const protocol = req.protocol;
  return { url: `${protocol}://${host}`, domain: host };
}

export default router;
