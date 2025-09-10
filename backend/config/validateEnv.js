// Simple environment variable validation & warnings
const REQUIRED = ['MONGO_URI', 'JWT_SECRET'];

function validateEnv() {
  const missing = REQUIRED.filter(v => !process.env[v]);
  if (missing.length) {
    console.error('[env] Missing required env vars:', missing.join(', '));
    throw new Error('Missing required environment variables');
  }

  if (process.env.DEV_ADMIN_BYPASS === 'true' && process.env.NODE_ENV === 'production') {
    console.warn('[env] DEV_ADMIN_BYPASS should NOT be true in production.');
  }

  if (process.env.SERVE_FRONTEND === 'true') {
    // no-op – presence just noted
  }
}

module.exports = { validateEnv };