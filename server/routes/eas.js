import { Router } from 'express';
import 'dotenv/config';
import { encodeAttestationData } from '../lib/easSchema.js';
import { CONTRACTS } from '../lib/chains.js';

const router = Router();

router.post('/prepare', async (req, res) => {
  const { address, artist, ogRespect, zorRespect, empireRank, wavewarzWins, wavewarzVolumeSol } = req.body;

  if (!process.env.EAS_SCHEMA_UID) {
    return res.status(500).json({
      error: 'EAS_SCHEMA_UID not set - run scripts/register-schema.js once first',
    });
  }

  try {
    const snapshotTimestamp = Math.floor(Date.now() / 1000);

    const encodedData = encodeAttestationData({
      artist,
      ogRespect,
      zorRespect,
      empireRank,
      wavewarzWins,
      wavewarzVolumeSol,
      snapshotTimestamp,
    });

    res.json({
      easContractAddress: CONTRACTS.easBase,
      schemaUID: process.env.EAS_SCHEMA_UID,
      recipient: address,
      encodedData,
      snapshotTimestamp,
    });
  } catch (err) {
    console.error('[eas] prepare failed', err);
    res.status(500).json({ error: 'could not prepare attestation', detail: err.message });
  }
});

export default router;
