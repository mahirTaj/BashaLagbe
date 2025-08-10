const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const passport = require('passport');
const auth = require('../middleware/auth'); // JWT auth middleware
const multer = require('multer');

const upload = multer({ dest: 'uploads/' });

console.log('authController loaded');

// Register
router.post('/register', authController.register);

// Login
router.post('/login', authController.login);

// Google OAuth login
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Google OAuth callback
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Successful auth, generate token and redirect with token to frontend
    const token = req.user ? 
      require('jsonwebtoken').sign({ id: req.user._id }, process.env.JWT_SECRET, { expiresIn: '1h' })
      : null;

    res.redirect(`http://localhost:3000/oauth-success?token=${token}`);
  }
);

// Protected routes
router.get('/profile', auth, authController.getProfile);
router.put('/profile', auth, authController.updateProfile);
router.put('/password', auth, authController.changePassword);
const { changePassword } = require('../controllers/authController');
const { authenticate } = require('../config/passport');
router.post('/change-password', auth, changePassword);
router.post('/test', (req, res) => {
  console.log('Test route hit');
  res.json({ ok: true });
});
router.post('/upload-profile-pic', auth, upload.single('profilePic'), authController.uploadProfilePic);

module.exports = router;
