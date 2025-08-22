import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { ROLES, isAdminRole } from '../utils/roles.js';

export const requireAuth = async (req, res, next) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    const decoded = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: 'Invalid token' });
    if (user.status === 'BLOCKED') return res.status(403).json({ message: 'User is blocked' });

    req.user = { id: user._id.toString(), role: user.role, name: user.name, email: user.email };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
};

export const requireAdmin = (req, res, next) => {
  if (!req.user || !isAdminRole(req.user.role)) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

export const requireSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== ROLES.SUPER_ADMIN) {
    return res.status(403).json({ message: 'Super admin access required' });
  }
  next();
};