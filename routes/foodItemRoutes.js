// routes/foodItemRoutes.js
const express = require('express');
const {
  createFoodItem,
  getAllFoodItems,
  getFoodItemById,
  updateFoodItem,
  deleteFoodItem,
  giveRatingToFoodItem,
  getSimilarFoodItems
} = require('../controllers/foodItemController');

const router = express.Router();

router.post('/foodItems', createFoodItem);
router.get('/foodItems', getAllFoodItems);
router.get('/foodItems/:id', getFoodItemById);
router.put('/foodItems/:id', updateFoodItem);
router.delete('/foodItems/:id', deleteFoodItem);
router.put('/foodItems/:id/rate', giveRatingToFoodItem);
router.post('/foodItems/getSimilarFoodItems', getSimilarFoodItems);

module.exports = router;
