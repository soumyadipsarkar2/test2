// routes/bookingRoutes.js
const express = require('express');
const {getFeed} = require('../controllers/feedController');

const router = express.Router();

router.get('/feed', getFeed);

module.exports = router;
