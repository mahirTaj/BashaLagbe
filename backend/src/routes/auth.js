import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { env } from '../config/env.js';
import { isAdminRole } from '../utils/roles.js';

const router = Router();

// POST /api/auth/login  (admin-only login)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !isAdminRole(user.role)) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const match = await user.comparePassword(password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, role: user.role }, env.jwtSecret, { expiresIn: '12h' });
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ message: 'Login failed' });
  }
});

export default router;