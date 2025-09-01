// backend/middleware/auth.js
const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const authHeader = req.header('Authorization');

  // DEMO MODE: if no token but we want to run without login
  if (!authHeader && process.env.DEMO_MODE === 'true') {
    // ✅ Use a fixed string userId for demo
    req.user = { _id: "user_a" };
    console.log('[authMiddleware][DEMO] Using demo user "user_a"');
    return next();
  }

  if (!authHeader) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretKey');
    
    // ✅ Always store as string for real users
    const id = decoded.id || decoded._id || decoded.userId;
    req.user = { _id: id ? String(id) : null };

    if (!req.user._id) {
      return res.status(401).json({ message: 'Invalid token payload: missing user ID' });
    }

    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}

module.exports = authMiddleware;
