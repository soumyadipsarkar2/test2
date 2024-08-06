const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const CustomStrategy = require('passport-custom').Strategy;
const bcrypt = require('bcryptjs');
const User = require('../models/user');
require('dotenv').config(); // Load environment variables

module.exports = function(passport) {
  // Local Strategy
  passport.use(
    new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
      try {
        // Match user
        const user = await User.findOne({ email });

        if (!user) {
          return done(null, false, { message: 'That email is not registered' });
        }

        // Match password
        const isMatch = await bcrypt.compare(password, user.password);

        if (isMatch) {
          return done(null, user);
        } else {
          return done(null, false, { message: 'Password incorrect' });
        }
      } catch (err) {
        console.error(err);
        return done(err);
      }
    })
  );

  // Google Strategy
  passport.use(
    new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists in our db
        const existingUser = await User.findOne({ googleId: profile.id });

        if (existingUser) {
          // Already have the user
          return done(null, existingUser);
        }

        // If not, create a new user in our db
        const newUser = new User({
          googleId: profile.id,
          name: profile.displayName,
          email: profile._json.email
        });

        await newUser.save();
        done(null, newUser);
      } catch (err) {
        console.error(err);
        done(err);
      }
    })
  );

  // Phone Strategy
  passport.use('phone', new CustomStrategy(
    async (req, done) => {
      const { phoneNumber, otp } = req.body;

      try {
        const isOtpValid = await validateOtp(phoneNumber, otp); // Implement OTP validation
        if (!isOtpValid) {
          return done(null, false, { message: 'Invalid OTP' });
        }

        const user = await User.findOne({ phoneNumber });
        if (!user) {
          return done(null, false, { message: 'User not found' });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  ));

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      console.error(err);
      done(err, null);
    }
  });
};