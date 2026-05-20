/**
 * Vercel Serverless Entry Point
 */

// Explicitly require pg so Vercel's bundler (nft) includes it in the function bundle.
// Sequelize loads pg dynamically via require(dialect) which static tracers can't follow.
require('pg');

let app;
let initError = null;

try {
  app = require('../backend/server');
} catch (err) {
  initError = err;
  console.error('[api/index.js] Failed to load backend/server.js:', err.message, err.stack);
}

module.exports = (req, res) => {
  if (initError) {
    return res.status(500).json({
      error: 'Server initialization failed',
      message: initError.message,
      type: initError.constructor.name,
    });
  }

  // Debug: surface the exact URL Vercel passes to Express
  if (req.url === '/api/_debug' || req.url === '/_debug') {
    return res.status(200).json({
      url: req.url,
      path: req.path,
      originalUrl: req.originalUrl,
      method: req.method,
      headers: {
        host: req.headers.host,
        'x-forwarded-for': req.headers['x-forwarded-for'],
      },
    });
  }

  return app(req, res);
};
