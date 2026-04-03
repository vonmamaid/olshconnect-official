const path = require('path');

function sanitizeRoute(route) {
  if (typeof route !== 'string') return '';
  // Match your existing local proxy: it uses the first segment after `/api/`
  // (e.g. `/api/program/123` -> `program`).
  const first = route.split('/').filter(Boolean).shift() || '';
  // Only allow characters that exist in your filenames (a-z, 0-9, hyphen).
  // This prevents path traversal like `../`.
  if (!/^[a-z0-9-]+$/i.test(first)) return '';
  return first;
}

module.exports = async (req, res) => {
  const routeFromQuery = req.query && typeof req.query.route === 'string' ? req.query.route : '';
  const route = sanitizeRoute(routeFromQuery);

  if (!route) {
    // Keep a friendly error; front-end should normally hit a valid route.
    return res.status(400).json({ message: 'Invalid API route' });
  }

  // Prevent accidental recursion if someone calls `/api/router`.
  if (route === 'router') {
    return res.status(404).json({ message: 'Use /api/<endpoint> (not /api/router)' });
  }

  if (route === 'health') {
    return res.json({ ok: true });
  }

  const handlerPath = path.join(__dirname, `${route}.js`);

  try {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    const handler = require(handlerPath);
    if (typeof handler !== 'function') {
      return res.status(500).json({ message: `Invalid handler for route: ${route}` });
    }
    return handler(req, res);
  } catch (err) {
    if (err && (err.code === 'MODULE_NOT_FOUND' || /Cannot find module/.test(String(err.message)))) {
      return res.status(404).json({ message: `API not found: ${route}` });
    }
    console.error(`[api/router] ${req.method} /api/${route} failed:`, err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

