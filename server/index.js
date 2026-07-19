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

app.get('/api/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`ZAO Artist Value Ledger running on :${PORT}`);
});
