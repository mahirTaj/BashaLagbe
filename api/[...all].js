// Catch-all Vercel serverless entrypoint for any /api/* path
const app = require('../backend/app');
module.exports = (req, res) => app(req, res);
