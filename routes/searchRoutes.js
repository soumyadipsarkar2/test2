// routes/searchRoutes.js
const express = require('express');
const { searchSuggestions } = require('../controllers/searchController');

const router = express.Router();

router.get('/search', searchSuggestions);

module.exports = router;
