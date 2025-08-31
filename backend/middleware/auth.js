// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose'); // ✅ Add mongoose for ObjectId

function authMiddleware(req, res, next) {
  const authHeader = req.header('Authorization');

  // DEMO MODE: if no token but we want to run without login
  if (!authHeader && process.env.DEMO_MODE === 'true') {
    // ✅ Use a fixed, valid ObjectId string instead of "demo-user"
    req.user = { _id: new mongoose.Types.ObjectId("64fba8920dd5b95e5cce9f12") };
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

    // ✅ Ensure it's always an ObjectId instance
    if (!mongoose.isValidObjectId(req.user._id)) {
      req.user._id = new mongoose.Types.ObjectId(req.user._id);
    }

    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// ✅ Export the function directly
module.exports = authMiddleware;
