/**
 * Local API server — runs your api/*.js handlers without Vercel.
 * Use when "vercel dev" is not available (e.g. billing/account issues).
 *
 * Run: node local-api-server.js
 * Then run the React app in another terminal: npm start
 * The app will proxy /api/* to this server (see "proxy" in package.json).
 */

require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const { checkRateLimit, tryEnterRequest, leaveRequest } = require('./api/_security');

const app = express();
const PORT = process.env.API_PORT || 3001;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use((req, res, next) => {
  const rateCheck = checkRateLimit(req);
  if (!rateCheck.allowed) {
    res.setHeader('Retry-After', String(rateCheck.retryAfterSeconds));
    return res.status(429).json({ message: 'Too many requests. Please try again later.' });
  }
  return next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Local API server is running' });
});

// Mount all api/*.js handlers under /api/:name
app.all('/api/*', async (req, res) => {
  if (!tryEnterRequest()) {
    return res.status(503).json({ message: 'Server is busy. Please try again shortly.' });
  }

  const segments = req.path.split('/').filter(Boolean);
  const name = (segments[1] || '').replace(/[^a-z0-9-]/gi, '');
  if (!name) {
    return res.status(404).json({ message: 'API path required' });
  }

  const apiPath = path.join(__dirname, 'api', `_${name}.js`);
  if (!fs.existsSync(apiPath)) {
    return res.status(404).json({ message: `API not found: ${name}` });
  }

  try {
    // Clear require cache so changes to api files are picked up in dev
    delete require.cache[require.resolve(apiPath)];
    const handler = require(apiPath);
    if (typeof handler !== 'function') {
      return res.status(500).json({ message: 'Invalid API handler' });
    }
    await handler(req, res);
  } catch (err) {
    console.error(`[local-api] ${req.method} ${req.path}`, err.message);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  } finally {
    leaveRequest();
  }
});

app.listen(PORT, () => {
  console.log(`\n  Local API server running at http://localhost:${PORT}`);
  console.log(`  Proxy /api/* from the React app to this port.`);
  console.log(`  Start the React app in another terminal: npm start\n`);
});
