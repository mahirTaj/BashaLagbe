const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  // Get token from header
  const raw = req.header('Authorization');
  console.log('[AUTH MIDDLEWARE] Authorization header raw:', raw);

  if (!raw || !raw.startsWith('Bearer ')) {
    console.log('[AUTH MIDDLEWARE] No Bearer token provided');
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  const token = raw.slice(7).trim();
  console.log('[AUTH MIDDLEWARE] token string:', token);

  if (!token) {
    console.log('[AUTH MIDDLEWARE] Token string empty after Bearer');
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('[AUTH MIDDLEWARE] token decoded:', decoded);
    req.user = decoded;
    next();
  } catch (err) {
    console.log('[AUTH MIDDLEWARE] jwt.verify error:', err && err.message);
    res.status(401).json({ msg: 'Token is not valid' });
  }
};