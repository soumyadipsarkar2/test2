// auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { sendOtp, validateOtp } = require('../utils/otpService');
const CachedData = require('../models/cachedData');

// Helper function to generate a new JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '1d' });
};

// Register route
router.post('/register', async (req, res) => {
  const { name, email, phoneNumber, gender, password, dateOfBirth } = req.body;
  let errors = [];

  // Validate input fields
  if (!email || !password) {
    errors.push({ msg: 'Please enter all fields' });
  }

  // Validate password length
  if (password.length < 6) {
    errors.push({ msg: 'Password must be at least 6 characters' });
  }

  // Return errors if any
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  try {
    // Check if either email or phone number already exists
    const existingUser = await User.findOne({ $or: [{ email }, { phoneNumber }] });

    if (existingUser) {
      return res.status(400).json({ errors: [{ msg: 'Email or phone number already exists' }] });
    }

    // Create a new user instance
    const newUser = new User({
      name,
      email,
      phoneNumber,
      gender,
      password,
      dateOfBirth
    });

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    newUser.password = await bcrypt.hash(password, salt);

    // Save the new user to the database
    await newUser.save();
    res.status(201).json({ msg: 'User registered' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Login route
router.post('/login', async (req, res, next) => {
  passport.authenticate('local', async (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(400).json({ msg: 'Invalid credentials' });

    req.logIn(user, async (err) => {
      if (err) return next(err);

      // Generate a new token and store it in Redis
      const token = generateToken(user.id);
      const cacheKey = `token#${user.id}`;
      
      // Delete any existing token
      await CachedData.deleteOne({ key: cacheKey });

      // Store the new token in Redis with expiration
      await CachedData.create({ key: cacheKey, value: token });

      res.json({ token });
    });
  })(req, res, next);
});

// Google Auth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', passport.authenticate('google', { session: false }), async (req, res) => {
  const token = generateToken(req.user.id);
  const cacheKey = `token#${req.user.id}`;

  // Delete any existing token
  await CachedData.deleteOne({ key: cacheKey });

  // Store the new token in Redis with expiration
  await CachedData.create({ key: cacheKey, value: token });

  res.json({ token });
});

// Phone Auth - Send OTP
router.post('/send-otp', async (req, res) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber) return res.status(400).json({ msg: 'Phone number is required' });

  const success = await sendOtp(phoneNumber);
  if (success) {
    res.status(200).json({ msg: 'OTP sent' });
  } else {
    res.status(500).json({ msg: 'Error sending OTP' });
  }
});

// Phone Auth - Verify OTP
router.post('/verify-otp', async (req, res) => {
  const { phoneNumber, otp } = req.body;
  if (!phoneNumber || !otp) return res.status(400).json({ msg: 'Phone number and OTP are required' });

  const isValid = validateOtp(phoneNumber, otp);
  if (isValid) {
    // Find or create user with phone number
    let user = await User.findOne({ phoneNumber });

    if (!user) {
      // If user does not exist, create a new one (minimal user creation)
      user = new User({ phoneNumber });
      await user.save();
    }

    req.logIn(user, async (err) => {
      if (err) return res.status(500).json({ msg: 'Server error' });

      // Generate a new token and store it in Redis
      const token = generateToken(user.id);
      const cacheKey = `token#${user.id}`;

      // Delete any existing token
      await CachedData.deleteOne({ key: cacheKey });

      // Store the new token in Redis with expiration
      await CachedData.create({ key: cacheKey, value: token });

      res.json({ token });
    });
  } else {
    res.status(400).json({ msg: 'Invalid OTP' });
  }
});

// Logout route
router.post('/logout', async (req, res) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Access Denied' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;
    const cacheKey = `token#${userId}`;

    // Delete the token from Redis
    await CachedData.deleteOne({ key: cacheKey });

    res.status(200).json({ message: 'Logged out successfully' });
  } catch (err) {
    res.status(400).json({ message: 'Invalid Token' });
  }
});

module.exports = router;