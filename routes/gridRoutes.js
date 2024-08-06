// routes/gridRoutes.js
const express = require('express');
const {
    precalculateNearbyRestaurants
} = require('../controllers/gridController');

const router = express.Router();

router.get('/precalculate', precalculateNearbyRestaurants);

module.exports = router;
