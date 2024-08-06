// routes/restaurantRoutes.js
const express = require('express');
const {
  createRestaurant,
  getFilteredRestaurants,
  getRestaurantById,
  updateRestaurant,
  deleteRestaurant,
  giveRatingToRestaurant,
  getPopularCuisinesNearby,
  getPopularDiningCatergoriesNearby,
  getPopularLocationsNearby,
  getDeliveryFilteredRestaurants,
  getDiningFilteredRestaurants,
  getAllOutlets,
  getSimilarRestaurants,
  createRating,
  getRestaurantDetailsWithFoodItems,
  getPopularRestaurants
} = require('../controllers/restaurantController');

const router = express.Router();

router.post('/restaurants', createRestaurant);
router.get('/restaurants', getFilteredRestaurants);
router.get('/restaurants/similar', getSimilarRestaurants);
router.get('/restaurants/outlets', getAllOutlets);
router.get('/restaurants/delivery', getDeliveryFilteredRestaurants);
router.get('/restaurants/dining', getDiningFilteredRestaurants);
router.get('/restaurants/delivery/popularCuisines', getPopularCuisinesNearby);
router.get('/restaurants/dining/popularDiningCategories', getPopularDiningCatergoriesNearby);
router.get('/restaurants/dining/popularLocations', getPopularLocationsNearby);
router.get('/restaurants/popular', getPopularRestaurants);
router.get('/restaurants/:id', getRestaurantById);
router.put('/restaurants/:id', updateRestaurant);
router.delete('/restaurants/:id', deleteRestaurant);
router.put('/restaurants/:id/rate', giveRatingToRestaurant);
router.post('/ratings', createRating);
router.get('/restaurants/:id/details', getRestaurantDetailsWithFoodItems);

module.exports = router;
