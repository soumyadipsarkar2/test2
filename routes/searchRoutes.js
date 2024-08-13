// routes/searchRoutes.js
const express = require('express');
const { searchSuggestions,searchFoodItems } = require('../controllers/searchController');

const router = express.Router();

router.get('/search', searchSuggestions);
router.get('/search/food-items', searchFoodItems);

module.exports = router;
