import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json({ limit: '50kb' }));

const WEBHOOK_URL = process.env.WEBHOOK_URL;
const PORT = Number(process.env.PROXY_PORT || 8787);
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 30);
const ALLOWED_ORIGIN = process.env.PROXY_ALLOWED_ORIGIN || 'http://localhost:3000';

type RateBucket = { count: number; resetAt: number };
const rateBuckets = new Map<string, RateBucket>();

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const existing = rateBuckets.get(key);
  if (!existing || now > existing.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  if (existing.count >= RATE_LIMIT_MAX) return true;
  existing.count += 1;
  return false;
}

app.post('/api/chat', async (req, res) => {
  if (!WEBHOOK_URL) {
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  const clientKey = req.ip || 'unknown';
  if (isRateLimited(clientKey)) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  const sessionId = typeof req.body?.sessionId === 'string' ? req.body.sessionId : '';

  if (!message || !sessionId) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const upstream = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatInput: message, sessionId }),
      signal: controller.signal,
    });

    const rawText = await upstream.text();
    let data: unknown = rawText;

    if (upstream.headers.get('content-type')?.includes('application/json')) {
      try {
        data = JSON.parse(rawText);
      } catch {
        data = rawText;
      }
    }

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: 'Upstream error' });
    }

    return res.json(data);
  } catch (error) {
    const isTimeout = error instanceof DOMException && error.name === 'AbortError';
    return res.status(502).json({ error: isTimeout ? 'Upstream timeout' : 'Upstream unavailable' });
  } finally {
    clearTimeout(timeout);
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});
