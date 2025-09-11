// Vercel serverless entrypoint wrapping Express app
const app = require('../backend/app');
module.exports = (req, res) => app(req, res);
