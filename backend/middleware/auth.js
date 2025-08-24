const jwt = require('jsonwebtoken');

// In development the frontend uses simple dummy tokens (token_a, token_b).
// To make local testing easier, accept those tokens and map them to test users.
const DEV_TOKEN_MAP = {
  'token_a': { id: 'user_a', name: 'Alice', role: 'landlord' },
  'token_b': { id: 'user_b', name: 'Bob', role: 'tenant' },
};

module.exports = function (req, res, next) {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

  // Try to verify as JWT. If that fails and we're in development,
  // accept mapped dev tokens so the frontend's dummy auth works.
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    // If not production and token matches a dev token, allow it.
    if (process.env.NODE_ENV !== 'production' && DEV_TOKEN_MAP[token]) {
      req.user = DEV_TOKEN_MAP[token];
      return next();
    }
    return res.status(401).json({ message: 'Token is not valid' });
  }
};