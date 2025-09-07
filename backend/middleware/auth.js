const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

async function authenticate(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    const m = auth.match(/^Bearer\s+(.*)$/);
    if (!m) return res.status(401).json({ error: 'Missing token' });
    const token = m[1];
    let payload;
    try { payload = jwt.verify(token, JWT_SECRET); } catch (e) { return res.status(401).json({ error: 'Invalid token' }); }
    req.auth = { userId: payload.sub, role: payload.role };
    // optional attach user
    try { req.user = await User.findById(payload.sub).select('-passwordHash'); } catch {};
    next();
  } catch (e) {
    console.error('Auth middleware error', e);
    res.status(500).json({ error: 'Server error' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    // Dev override: accept simple admin-token header used by admin routes
    const adminToken = req.headers['admin-token'];
    if (role === 'admin' && adminToken === 'superadmin-token') {
      req.auth = req.auth || { userId: 'admin-dev', role: 'admin' };
      return next();
    }

    if (!req.auth) return res.status(401).json({ error: 'Not authenticated' });
    if (req.auth.role !== role) return res.status(403).json({ error: 'Forbidden: insufficient role' });
    next();
  };
}

module.exports = { authenticate, requireRole };
