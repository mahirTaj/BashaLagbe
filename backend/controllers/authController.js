const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// Register
exports.register = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    // Create new user
    user = new User({ name, email, password });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();

    // Return jsonwebtoken
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.status(201).json({ token });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Login
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if user exists
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    if (!user.password) {
      return res.status(400).json({ msg: 'This account does not have a password. Please login with Google.' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // Return jsonwebtoken
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user && (req.user.id || req.user._id) ? (req.user.id || req.user._id) : null;
    const { name, contact, preferences, profilePic } = req.body;

    // Debug: log incoming update for troubleshooting (server-side only)
    // eslint-disable-next-line no-console
    console.debug('[authController] updateProfile called for userId=', userId, 'body=', { name, contact, preferences, profilePic });

    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    // Find user and update fields; runValidators ensures schema validation on updates
    const user = await User.findByIdAndUpdate(
      userId,
      { name, contact, preferences, profilePic },
      { new: true, runValidators: true }
    );

    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json(user);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[authController] updateProfile error', err?.message || err);
    res.status(400).json({ error: 'Profile update failed.', details: err?.message });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('User ID:', userId);
    const { oldPassword, newPassword } = req.body;
    console.log('Old Password:', oldPassword);
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    console.log('User password in DB:', user.password);

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    console.log('Password match:', isMatch);

    if (!isMatch) return res.status(400).json({ error: 'Old password incorrect.' });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();
    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    res.status(400).json({ error: 'Password change failed.' });
  }
};

// Profile picture upload
exports.uploadProfilePic = (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
};
