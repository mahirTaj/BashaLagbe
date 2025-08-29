// backend/middleware/auth.js
const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const authHeader = req.header('Authorization');

  // DEMO MODE: if no token but we want to run without login
  if (!authHeader && process.env.DEMO_MODE === 'true') {
    req.user = { id: 'demo-user' }; // Fake user ID for demo
    return next();
  }

  if (!authHeader) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretKey');
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// ✅ Export the function directly so `require('../middleware/auth')` returns a function
module.exports = authMiddleware;