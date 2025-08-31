// backend/middleware/auth.js
const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const authHeader = req.header('Authorization');

  // DEMO MODE: if no token but we want to run without login
  if (!authHeader && process.env.DEMO_MODE === 'true') {
    req.user = { _id: 'demo-user' }; // ✅ Fake user ID for demo
    return next();
  }

  if (!authHeader) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretKey');
    // Normalize user object so _id is always available
    req.user = { _id: decoded.id || decoded._id };
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// ✅ Export the function directly
module.exports = authMiddleware;
