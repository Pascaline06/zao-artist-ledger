import { Router } from 'express';
import 'dotenv/config';

const router = Router();

router.get('/', (req, res) => {
  res.json({ walletConnectProjectId: process.env.WALLETCONNECT_PROJECT_ID || null });
});

export default router;
