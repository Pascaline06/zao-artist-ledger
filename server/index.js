import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

import respectRoute from './routes/respect.js';
import empireRoute from './routes/empire.js';
import wavewarzRoute from './routes/wavewarz.js';
import easRoute from './routes/eas.js';
import identityRoute from './routes/identity.js';
import siwfRoute from './routes/siwf.js';
import configRoute from './routes/config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/respect', respectRoute);
app.use('/api/empire', empireRoute);
app.use('/api/wavewarz', wavewarzRoute);
app.use('/api/eas', easRoute);
app.use('/api/identity', identityRoute);
app.use('/api/siwf', siwfRoute);
app.use('/api/config', configRoute);

app.get('/api/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;

// Vercel runs this file as an on-demand function, not a long-lived process -
// app.listen() should only run in a normal environment like Termux/local dev.
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`ZAO Artist Value Ledger running on :${PORT}`);
  });
}

export default app;
