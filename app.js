// app.js
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const passport = require('passport');
const session = require('express-session');
const flash = require('connect-flash');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const sessionStore = require('session-memory-store')(session);
const CachedData = require('./models/cachedData');

dotenv.config();

// Import routes
const bookingRoutes = require('./routes/bookingRoutes');
const commentRoutes = require('./routes/commentRoutes');
const videoRoutes = require('./routes/videoRoutes');
const foodItemRoutes = require('./routes/foodItemRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const offerRoutes = require('./routes/offerRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const restaurantRoutes = require('./routes/restaurantRoutes');
const supportChatRoutes = require('./routes/supportChatRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const userRoutes = require('./routes/userRoutes');
const searchRoutes = require('./routes/searchRoutes');
const feedRoutes = require('./routes/feedRoutes');
const gridRoutes = require('./routes/gridRoutes');
const userLikeRoutes = require('./routes/userLikeRoutes');
const authRoutes = require('./routes/auth'); // Import auth routes

const app = express();

// Passport Config
require('./config/passport')(passport);

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Express session
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  store: new sessionStore()
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Connect flash
app.use(flash());

// Global variables
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  next();
});

// MongoDB Connection
const connectDB = require('./db/connect');
connectDB()
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Authentication middleware
const authenticateJWT = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Access Denied' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Use secret key from env
    const cacheKey = `token#${decoded.id}`;
    let cachedToken = await CachedData.findOne({ key: cacheKey });
    if(cachedToken){cachedToken=cachedToken.value;}
    if (cachedToken !== token) return res.status(401).json({ message: 'Access Denied' });
    // await CachedData.create({ key: cacheKey, value: token });
    req.user = decoded;
    next();
  } catch (err) {
    res.status(400).json({ message: err });
  }
};

// Public Routes
app.use('/auth', authRoutes); // Public routes for authentication

// Hello World Route
app.get('/hello', (req, res) => {
  res.send('Hello, World!');
});

// Protected Routes
const protectedRoutes = express.Router();
protectedRoutes.use(authenticateJWT); // Apply authenticateJWT middleware to all routes in this router

// Add protected routes
protectedRoutes.use('/', bookingRoutes);
protectedRoutes.use('/', commentRoutes);
protectedRoutes.use('/', videoRoutes);
protectedRoutes.use('/', foodItemRoutes);
protectedRoutes.use('/', notificationRoutes);
protectedRoutes.use('/', offerRoutes);
protectedRoutes.use('/', orderRoutes);
protectedRoutes.use('/', paymentRoutes);
protectedRoutes.use('/', restaurantRoutes);
protectedRoutes.use('/', supportChatRoutes);
protectedRoutes.use('/', ticketRoutes);
protectedRoutes.use('/', searchRoutes);
protectedRoutes.use('/', feedRoutes);
protectedRoutes.use('/', gridRoutes);
protectedRoutes.use('/', userRoutes);
protectedRoutes.use('/', userLikeRoutes);

// Use protected routes under /api prefix
app.use('/', protectedRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error', data: null });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});