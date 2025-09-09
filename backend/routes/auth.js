const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
const DEV_ADMIN_BYPASS = process.env.DEV_ADMIN_BYPASS === 'true';
const TOKEN_EXPIRY = '7d';

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body || {};
  if (!name || !email || !password || !role) return res.status(400).json({ error: 'name,email,password,role required' });
  if (!['renter','owner','admin'].includes(role)) return res.status(400).json({ error: 'role must be renter, owner, or admin' });

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const user = new User({ name, email, passwordHash: hash, role });
    await user.save();

    const token = jwt.sign({ sub: user._id, role: user.role }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (e) {
    console.error('Register error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ sub: user._id, role: user.role }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (e) {
    console.error('Login error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const m = auth.match(/^Bearer\s+(.*)$/);
    if (!m) return res.status(401).json({ error: 'Missing token' });
    const token = m[1];
    let payload;
    try { payload = jwt.verify(token, JWT_SECRET); } catch { return res.status(401).json({ error: 'Invalid token' }); }
    const user = await User.findById(payload.sub).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (e) {
    console.error('Me error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

// Dev-only admin login using header admin-token
// Returns a signed JWT with role 'admin' when header matches 'superadmin-token'
router.post('/admin-dev', (req, res) => {
  try {
    if (!DEV_ADMIN_BYPASS) return res.status(404).json({ error: 'Not found' });
    const adminToken = req.headers['admin-token'];
    const expected = process.env.DEV_ADMIN_TOKEN || 'superadmin-token';
    if (adminToken !== expected) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const user = { id: 'admin-dev', name: 'Dev Admin', email: 'admin@local', role: 'admin' };
    const token = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
    return res.json({ token, user });
  } catch (e) {
    return res.status(500).json({ error: 'Server error' });
  }
});
