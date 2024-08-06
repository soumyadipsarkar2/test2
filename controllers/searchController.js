const mongoose = require('mongoose');
const Restaurant = require('../models/restaurant');
const FoodItem = require('../models/foodItem');
const { findRestaurantsWithinRadius } = require('./restaurantController');

const searchSuggestions = async (req, res) => {
  const { query, latitude, longitude } = req.query;
  if (!query) {
    return res.status(400).json({ message: 'Query parameter is required', data: null });
  }
  if (!latitude || !longitude) {
    return res.status(400).json({ message: 'Latitude and longitude are required', data: null });
  }

  try {
    // Step 1: Get nearby restaurants within 0 to 5 KM
    const nearbyRestaurants = await findRestaurantsWithinRadius(latitude, longitude, 0, 5);
    const nearbyRestaurantIds = nearbyRestaurants.map(r => r.restaurantId);

    // Step 2: Search within the nearby restaurants for name and cuisines
    const restaurantSuggestions = await Restaurant.find(
      {
        _id: { $in: nearbyRestaurantIds },
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { cuisines: { $regex: `^${query}`, $options: 'i' } }
        ]
      },
      { name: 1, mainImage: 1, rating: 1, numberOfRatings: 1, cuisines: 1 }
    ).sort({ rating: -1 }).limit(10);

    // Step 3: Search in FoodItem names and cuisines within nearby restaurants
    const foodItemSuggestions = await FoodItem.find(
      {
        restaurantId: { $in: nearbyRestaurantIds },
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { cuisines: { $regex: `^${query}`, $options: 'i' } }
        ]
      },
      { name: 1, mainImage: 1, restaurantId: 1 }
    ).populate('restaurantId', 'name mainImage rating numberOfRatings').limit(10);

    // Merge unique restaurant details from food items into restaurantSuggestions
    const restaurantDetailsFromFoodItems = foodItemSuggestions.map(foodItem => ({
      _id: foodItem.restaurantId._id,
      name: foodItem.restaurantId.name,
      mainImage: foodItem.restaurantId.mainImage,
      rating: foodItem.restaurantId.rating,
      numberOfRatings: foodItem.restaurantId.numberOfRatings,
      cuisines: foodItem.restaurantId.cuisines
    }));

    const uniqueRestaurantDetails = [...restaurantSuggestions, ...restaurantDetailsFromFoodItems];

    // Remove duplicate restaurants
    const uniqueRestaurants = [...new Map(uniqueRestaurantDetails.map(item => [item['_id'], item])).values()];

    // Sort unique restaurants by rating descending
    uniqueRestaurants.sort((a, b) => b.rating - a.rating);

    // Find unique cuisines that match the query prefix from nearby restaurants only
    const cuisinesFromNearbyRestaurants = uniqueRestaurants.flatMap(restaurant => restaurant.cuisines);
    const matchingCuisines = [...new Set(cuisinesFromNearbyRestaurants.filter(cuisine => {
      // Check if the cuisine is defined and if it matches the prefix
      return cuisine && cuisine.toLowerCase().startsWith(query.toLowerCase());
    }))];
    
    res.status(200).json({
      message: 'Suggestions retrieved successfully',
      data: {
        restaurants: uniqueRestaurants,
        foodItems: foodItemSuggestions.map(foodItem => ({
          name: foodItem.name,
          mainImage: foodItem.mainImage
        })),
        cuisines: matchingCuisines
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

module.exports = { searchSuggestions };