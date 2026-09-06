import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { connectDb } from './config/db.js';
import { ensureAdmin } from './services/admin.js';
import authRoutes from './routes/auth.js';
import scanRoutes from './routes/scans.js';
import aiRoutes from './routes/ai.js';
import exportRoutes from './routes/exports.js';
import workspaceRoutes from './routes/workspace.js';
import billingRoutes from './routes/billing.js';

const app = express();
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

app.get('/health', (req, res) => res.json({ ok: true, app: env.appName, env: env.nodeEnv, time: new Date().toISOString() }));
app.use('/api/auth', authRoutes);
app.use('/api/scans', scanRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/exports', exportRoutes);
app.use('/api/workspace', workspaceRoutes);
app.use('/api/billing', billingRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  if (err?.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File too large' });
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

await connectDb();
await ensureAdmin();
app.listen(env.port, '0.0.0.0', () => console.log(`[api] http://0.0.0.0:${env.port}`));
