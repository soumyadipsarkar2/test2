// controllers/restaurantController.js
const Restaurant = require('../models/restaurant');
const CachedData = require('../models/cachedData');
const FoodItem = require('../models/foodItem');
const Order = require('../models/order');
const mongoose = require('mongoose');
const mapboxClient = require('@mapbox/mapbox-sdk/services/geocoding');
// const mbxClient = mapboxClient({ accessToken: 'pk.eyJ1Ijoic291bXlhZGlwc2Fya2FyIiwiYSI6ImNseWN6OHNzazAwcHkybXF5NWd2b3N0MTUifQ.Utd-JffEznqet-j2GKNX7g' });
const matrixClient = require('@mapbox/mapbox-sdk/services/matrix');
const mbxMatrix = matrixClient({ accessToken: 'pk.eyJ1Ijoic291bXlhZGlwc2Fya2FyIiwiYSI6ImNseWN6OHNzazAwcHkybXF5NWd2b3N0MTUifQ.Utd-JffEznqet-j2GKNX7g' });
const { calculateRelevanceScore } = require('./feedController'); // Import the function

class RestaurantController {
  static async incrementReviewCount(restaurantId) {
    try {
      // Find the video by ID and update the comments count
      const updatedRestaurant = await Restaurant.findByIdAndUpdate(
        restaurantId,
        { $inc: { reviews: 1 } },
        { new: true, useFindAndModify: false }
      );

      if (!updatedRestaurant) {
        throw new Error('Restaurant not found');
      }

      return updatedRestaurant;
    } catch (error) {
      console.error('Error incrementing review count:', error);
      throw error;
    }
  }

  // Get Restaurant by ID with specified fields
  static async getRestaurantById (restaurantId, fields) {
  try {
    const restaurant = await Restaurant.findById(restaurantId).select(fields.join(' '));
    if (!restaurant) return null;

    const result = {};
    fields.forEach(field => {
      result[field] = restaurant[field];
    });
    return result;
  } catch (error) {
    console.error('Error fetching restaurant by ID:', error);
    throw error;
  }
  };
}

// Create a new restaurant
const createRestaurant = async (req, res) => {
  try {
    const newRestaurant = new Restaurant(req.body);
    const savedRestaurant = await newRestaurant.save();
    res.status(201).json({ message: 'Restaurant created successfully', data: savedRestaurant });
  } catch (error) {
    res.status(400).json({ message: error.message, data: null });
  }
};

const normalizeRequestParams = (queryParams) => {
  const normalizedParams = {};
  for (const key in queryParams) {
    if (queryParams.hasOwnProperty(key)) {
      normalizedParams[key] = queryParams[key].toLowerCase();
    }
  }
  return normalizedParams;
};

const parseCoordinate = (value, digits) => {
  const factor = Math.pow(10, digits);
  return Math.round(value * factor) / factor;
};

async function calculateDistanceAndTime(restaurantLocation, userLatitude, userLongitude) {
  const parsedUserLatitude = parseCoordinate(userLatitude, 2);
  const parsedUserLongitude = parseCoordinate(userLongitude, 2);

  const cacheKey = `distance#restaurant#${restaurantLocation[1]}:${restaurantLocation[0]}#user#${parsedUserLatitude}:${parsedUserLongitude}`;
  console.log("cacheKey", cacheKey);

  let cachedData = await CachedData.findOne({ key: cacheKey });
  if(cachedData){cachedData=cachedData.value;}
  if (cachedData) {
    return JSON.parse(cachedData);
  }

  try {
    const matrixResponse = await mbxMatrix.getMatrix({
      points: [
        { coordinates: restaurantLocation },
        { coordinates: [parsedUserLongitude, parsedUserLatitude] }
      ],
      profile: 'driving',
      annotations: ['distance', 'duration']
    }).send();

    const distanceInMeters = matrixResponse.body.distances[0][1];
    const durationInSeconds = matrixResponse.body.durations[0][1];
    const distanceInKm = distanceInMeters / 1000;
    const durationInMinutes = durationInSeconds / 60;

    const result = { distanceInKm, durationInMinutes };
    await CachedData.create({ key: cacheKey, value: JSON.stringify(result) });

    return result;
  } catch (error) {
    console.error('Error calculating distance and time:', error);
    throw error;
  }
}

const getRestaurantDetailsWithFoodItems = async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    const restaurant = await Restaurant.findById(id);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    const foodItems = await FoodItem.find({ restaurantId: id });

    const groupedFoodItems = foodItems.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {});

    const { distanceInKm, durationInMinutes } = await calculateDistanceAndTime(restaurant.location.coordinates, parseFloat(latitude), parseFloat(longitude));

    const response = {
      restaurant,
      foodItems: groupedFoodItems,
      distanceInKm,
      durationInMinutes
    };

    res.status(200).json({ message: 'Restaurant details retrieved successfully', data: response });
  } catch (error) {
    console.error('Error retrieving restaurant details:', error);
    res.status(500).json({ message: error.message });
  }
};

// Read (Get) all restaurants
const getFilteredRestaurants = async (req, res) => {
  // const normalizedParams = normalizeRequestParams(req.query);

  let { latitude, longitude, nearby, minRadius, maxRadius, foodType, sort,category } = req.query;

  if (!latitude || !longitude) {
    return res.status(400).json({ error: 'Missing required query parameters: latitude and longitude' });
  }

  try {
    const filteredRestaurants = await getFilteredRestaurants2(
      latitude,
      longitude,
      minRadius,
      maxRadius,
      foodType,
      sort,
      category
    );
    res.status(200).json({ message: 'Restaurants fetched successfully', data: filteredRestaurants });
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Read (Get) a restaurant by ID
const getRestaurantById = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found', data: null });
    res.status(200).json({ message: 'Restaurant retrieved successfully', data: restaurant });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

// Update a restaurant by ID
const updateRestaurant = async (req, res) => {
  try {
    const updatedRestaurant = await Restaurant.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedRestaurant) return res.status(404).json({ message: 'Restaurant not found', data: null });
    res.status(200).json({ message: 'Restaurant updated successfully', data: updatedRestaurant });
  } catch (error) {
    res.status(400).json({ message: error.message, data: null });
  }
};

const giveRatingToRestaurant = async (req, res) => {
  const { rating } = req.body;
  const restaurantId = req.params.id;

  // Validate rating value (between 1 to 5)
  if (rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Rating must be between 1 and 5.' });
  }

  try {
    // Find the restaurant by ID
    const restaurant = await Restaurant.findById(restaurantId);

    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found.' });
    }

    // Calculate new average rating
    const currentTotalRating = restaurant.rating * restaurant.numberOfRatings;
    const newNumberOfRatings = restaurant.numberOfRatings + 1;
    let newAvgRating = (currentTotalRating + rating) / newNumberOfRatings;
    newAvgRating = Math.round(newAvgRating * 10) / 10;

    // Update restaurant document
    restaurant.rating = newAvgRating;
    restaurant.numberOfRatings = newNumberOfRatings;

    // Save updated restaurant
    await restaurant.save();

    res.json({
      message: 'Rating added successfully.',
      rating: newAvgRating,
      numberOfRatings: newNumberOfRatings
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Delete a restaurant by ID
const deleteRestaurant = async (req, res) => {
  try {
    const deletedRestaurant = await Restaurant.findByIdAndDelete(req.params.id);
    if (!deletedRestaurant) return res.status(404).json({ message: 'Restaurant not found', data: null });
    res.status(200).json({ message: 'Restaurant deleted successfully', data: deletedRestaurant });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

const generateCacheKey = (latitude, longitude,minRadius,maxRadius) => {
  return `restaurants:${latitude}:${longitude}:${minRadius}:${maxRadius}`;
};

const findRestaurantsWithinRadius = async (latitude, longitude, minRadius, maxRadius) => {
  const parsedLatitude = parseCoordinate(latitude, 3);
  const parsedLongitude = parseCoordinate(longitude, 3);

  const cacheKey = generateCacheKey(parsedLatitude, parsedLongitude, minRadius, maxRadius);
  console.log("cacheKey", cacheKey);

  let cachedData = await CachedData.findOne({ key: cacheKey });
  if (cachedData) {
    cachedData = cachedData.value;
    console.log("cacheKey1324243242423", cacheKey);
    return JSON.parse(cachedData);
  }

  try {
    // Step 1: Fetch all restaurants (in a broad radius, e.g., maxRadius + buffer)
    const allRestaurants = await Restaurant.find({}, { _id: 1, location: 1 });

    // Prepare coordinates for Mapbox Matrix API
    const coordinates = allRestaurants.map(restaurant => ({
      coordinates: restaurant.location.coordinates
    }));
    coordinates.unshift({ coordinates: [parsedLongitude, parsedLatitude] }); // Add the user location as the first coordinate

    // Step 2: Use Mapbox Matrix API to calculate distances and durations
    const matrixResponse = await mbxMatrix.getMatrix({
      points: coordinates,
      profile: 'driving',
      annotations: ['distance', 'duration']
    }).send();

    const distances = matrixResponse.body.distances[0]; // Distances from the user to each restaurant
    const durations = matrixResponse.body.durations[0]; // Durations from the user to each restaurant

    // Step 3: Filter and map distances to restaurants, keeping those within the specified range
    const restaurantsWithDistancesAndTimes = allRestaurants
      .map((restaurant, index) => ({
        restaurantId: restaurant._id,
        distanceInKm: distances[index + 1] / 1000, // Convert meters to kilometers
        timeInMinutes: durations[index + 1] / 60 // Convert seconds to minutes
      }))
      .filter(restaurant => {
        const distance = restaurant.distanceInKm;
        return distance >= minRadius && distance <= maxRadius;
      })
      .sort((a, b) => a.distanceInKm - b.distanceInKm); // Sort by distance ascending

    // Step 4: Cache the results
    await CachedData.create({ key: cacheKey, value: JSON.stringify(restaurantsWithDistancesAndTimes) });
    return restaurantsWithDistancesAndTimes;
  } catch (error) {
    console.error('Error fetching nearby restaurants:', error);
    throw error;
  }
};

const getPopularCuisinesNearby2 = async (latitude, longitude,radius) => {
  // Round latitude and longitude to 2 decimal places for caching
  const roundedLatitude = parseCoordinate(latitude, 2);
  const roundedLongitude = parseCoordinate(longitude, 2);

  // Generate cache key for popular cuisines
  const cacheKey = `popularCuisines:${roundedLatitude}:${roundedLongitude}:${radius}`;
  console.log("cacheKey", cacheKey);

  // Check if cached data exists
  let cachedData = await CachedData.findOne({ key: cacheKey });
  if(cachedData){cachedData=cachedData.value;}
  if (cachedData) {
    return JSON.parse(cachedData);
  }

  // Step 1: Find nearby restaurants
  const nearbyRestaurants = await findRestaurantsWithinRadius(latitude, longitude,0,radius);
  
  // Check if we have nearby restaurants
  if (nearbyRestaurants.length === 0) {
    return [];
  }

  // Extract restaurant IDs
  const restaurantIds = nearbyRestaurants.map(restaurant => restaurant.restaurantId);

  // Step 2: Fetch restaurant details from MongoDB
  const restaurantDetails = await Restaurant.find({ _id: { $in: restaurantIds } }, { _id: 1, cuisines: 1 });

  // Step 3: Group and count cuisines
  const cuisineCount = {};
  restaurantDetails.forEach(restaurant => {
    restaurant.cuisines.forEach(cuisine => {
      if (cuisineCount[cuisine]) {
        cuisineCount[cuisine]++;
      } else {
        cuisineCount[cuisine] = 1;
      }
    });
  });

  // Step 4: Sort cuisines by count
  const sortedCuisines = Object.entries(cuisineCount)
    .sort((a, b) => b[1] - a[1])
    .map(([cuisine, count]) => ({ cuisine, count }));

  // Step 5: Cache the results
  await CachedData.create({ key: cacheKey, value: JSON.stringify(sortedCuisines) });

  return sortedCuisines;
};

const getPopularCuisinesNearby = async (req, res) => {
  const { latitude, longitude,radius } = req.query;

  if (!latitude || !longitude||!radius) {
    return res.status(400).json({ error: 'Missing required query parameters' });
  }

  try {
    const popularCuisines = await getPopularCuisinesNearby2(parseFloat(latitude), parseFloat(longitude), parseFloat(radius));
    res.status(200).json({ message: 'Popular cuisines fetched successfully', data: popularCuisines });
  } catch (error) {
    console.error('Error getting popular cuisines:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getPopularDiningCategoriesNearby2 = async (latitude, longitude, radius) => {
  try {
    // Round latitude and longitude to 2 decimal places for caching
    const roundedLatitude = parseCoordinate(latitude, 2);
    const roundedLongitude = parseCoordinate(longitude, 2);

    // Generate cache key for popular dining categories
    const cacheKey = `popularDiningCategories:${roundedLatitude}:${roundedLongitude}:${radius}`;
    console.log("cacheKey", cacheKey);

    // Check if cached data exists
    let cachedData = await CachedData.findOne({ key: cacheKey });
    if(cachedData){cachedData=cachedData.value;}
    if (cachedData) {
      return JSON.parse(cachedData);
    }

    // Step 1: Find nearby restaurants
    const nearbyRestaurants = await findRestaurantsWithinRadius(latitude, longitude, 0, radius);

    // Check if we have nearby restaurants
    if (nearbyRestaurants.length === 0) {
      return [];
    }

    // Extract restaurant IDs
    const restaurantIds = nearbyRestaurants.map(restaurant => restaurant.restaurantId);

    // Step 2: Fetch restaurant details from MongoDB
    const restaurantDetails = await Restaurant.find(
      { _id: { $in: restaurantIds } },
      { _id: 1, diningCategories: 1 }
    );

    // Step 3: Group and count dining categories
    const categoryCount = {};
    restaurantDetails.forEach(restaurant => {
      restaurant.diningCategories.forEach(category => {
        if (categoryCount[category]) {
          categoryCount[category]++;
        } else {
          categoryCount[category] = 1;
        }
      });
    });

    // Step 4: Sort dining categories by count
    const sortedCategories = Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => ({ category, count }));

    // Step 5: Cache the results
    await CachedData.create({ key: cacheKey, value: JSON.stringify(sortedCategories) });

    return sortedCategories;
  } catch (error) {
    console.error("Error fetching popular dining categories:", error);
    throw error;
  }
};

const getPopularDiningCatergoriesNearby = async (req, res) => {
  const { latitude, longitude,radius } = req.query;

  if (!latitude || !longitude||!radius) {
    return res.status(400).json({ error: 'Missing required query parameters' });
  }

  try {
    const popularCuisines = await getPopularDiningCategoriesNearby2(parseFloat(latitude), parseFloat(longitude), parseFloat(radius));
    res.status(200).json({ message: 'Popular cuisines fetched successfully', data: popularCuisines });
  } catch (error) {
    console.error('Error getting popular cuisines:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getPopularLocationsNearby2 = async (latitude, longitude,radius) => {
  // Generate cache key for popular cuisines
  const cacheKey = `popularLocations:${latitude}:${longitude}:${radius}`;
  console.log("cacheKey", cacheKey);

  // Check if cached data exists
  let cachedData = await CachedData.findOne({ key: cacheKey });
  if(cachedData){cachedData=cachedData.value;}
  if (cachedData) {
    return JSON.parse(cachedData);
  }

  // Step 1: Find nearby restaurants
  const nearbyRestaurants = await findRestaurantsWithinRadius(latitude, longitude,0,radius);
  
  // Check if we have nearby restaurants
  if (nearbyRestaurants.length === 0) {
    return [];
  }

  // Extract restaurant IDs
  const restaurantIds = nearbyRestaurants.map(restaurant => restaurant.restaurantId);

  // Fetch restaurant details from MongoDB
  const restaurantDetails = await Restaurant.find(
    { _id: { $in: restaurantIds } },
    { _id: 1, 'address.city': 1 }
  );

  // Group and count restaurants by city
  const cityCount = {};
  restaurantDetails.forEach(restaurant => {
    const city = restaurant.address.city;
    if (cityCount[city]) {
      cityCount[city]++;
    } else {
      cityCount[city] = 1;
    }
  });

  // Sort cities by count
  const sortedCities = Object.entries(cityCount)
    .sort((a, b) => b[1] - a[1])
    .map(([city, count]) => ({ city, count }));

  // Step 5: Cache the results
  await CachedData.create({ key: cacheKey, value: JSON.stringify(sortedCities) });

  return sortedCities;
};

const getPopularLocationsNearby = async (req, res) => {
  const { latitude, longitude,radius } = req.query;

  if (!latitude || !longitude||!radius) {
    return res.status(400).json({ error: 'Missing required query parameters' });
  }
  // Round latitude and longitude to 2 decimal places for caching
  const roundedLatitude = parseCoordinate(parseFloat(latitude), 2);
  const roundedLongitude = parseCoordinate(parseFloat(longitude), 2);
  try {
    const popularCuisines = await getPopularLocationsNearby2(roundedLatitude,roundedLongitude,parseFloat(radius));
    res.status(200).json({ message: 'Popular cuisines fetched successfully', data: popularCuisines });
  } catch (error) {
    console.error('Error getting popular cuisines:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// function calculateRelevanceScore(restaurant) {
//   const ratingWeight = 0.7;
//   const reviewsWeight = 0.3;

//   const ratingScore = restaurant.rating ? restaurant.rating * ratingWeight : 0;
//   const reviewsScore = restaurant.numberOfRatings ? restaurant.numberOfRatings * reviewsWeight : 0;

//   return ratingScore + reviewsScore;
// }

const getRestaurantDetails = async (restaurantIds) => {
  const restaurantDetails = [];
  if (restaurantIds.length > 0) {
    const mongoResults = await Restaurant.find({ _id: { $in: restaurantIds } });

    mongoResults.forEach(result => {
      restaurantDetails.push(result);
    });
  }

  return restaurantDetails;
};

const getDeliveryFilteredRestaurants2 = async (filters) => {
  let { latitude, longitude, minRadius, maxRadius, foodType, sort, cuisines, rating, minCostForTwo, maxCostForTwo } = filters;

  // Determine radius values based on the nearby flag and provided minRadius/maxRadius
  let minR = 0;
  let maxR = 5;

  if (minRadius && maxRadius) {
    minR = minRadius ? parseFloat(minRadius) : 0;
    maxR = maxRadius ? parseFloat(maxRadius) : 100; // Set a high default max radius if not provided
  }

  // Find nearby restaurants within the specified radius
  const nearbyRestaurants = await findRestaurantsWithinRadius(parseFloat(latitude), parseFloat(longitude), minR, maxR);

  // Extract restaurant IDs for details lookup
  const restaurantIds = nearbyRestaurants.map(restaurant => restaurant.restaurantId);
  const restaurantDistances = {};
  nearbyRestaurants.forEach(restaurant => {
    restaurantDistances[restaurant.restaurantId] = restaurant.distanceInKm;
  });

  // Fetch restaurant details from cache or database
  const restaurantDetails = await getRestaurantDetails(restaurantIds);

  // Map details to the desired format
  let detailedRestaurants = restaurantDetails.map(detail => {
    const nearbyRestaurant = nearbyRestaurants.find(nearby => nearby.restaurantId.toString() === detail._id.toString());
    return {
      id: detail._id.toString(), // Ensure ID is included
      name: detail.name,
      rating: detail.rating,
      numberOfRatings: detail.numberOfRatings,
      distanceInKm: nearbyRestaurant ? nearbyRestaurant.distanceInKm : null, // Rename field for consistency
      cuisines: detail.cuisines,
      address: detail.address,
      averageCostForTwo: detail.avgCosts[2] || 'N/A', // Rename field and handle missing data
      images: detail.images,
      mainImage: detail.mainImage,
      foodType: detail.foodType,
      reviews: detail.reviews,
      relevanceScore: calculateRelevanceScore(detail, restaurantDistances[detail._id.toString()], 'restaurant'),
      modeSupported: detail.modeSupported
    };
  });

  // Filter by modeSupported for delivery or dining
  detailedRestaurants = detailedRestaurants.filter(restaurant => 
    restaurant.modeSupported.includes('delivery')
  );

  // Filter by foodType if specified and not 'Non Veg'
  if (foodType) {
    detailedRestaurants = detailedRestaurants.filter(restaurant => 
      restaurant.foodType.some(type => type.toLowerCase() === foodType.toLowerCase())
    );
  }

  // Filter by cuisines if specified
  if (cuisines) {
    detailedRestaurants = detailedRestaurants.filter(restaurant => 
      restaurant.cuisines.includes(cuisines)
    );
  }

  // Filter by rating if specified
  if (rating) {
    detailedRestaurants = detailedRestaurants.filter(restaurant => 
      restaurant.rating >= parseFloat(rating)
    );
  }

  // Filter by minCostForTwo and maxCostForTwo if specified
  if (minCostForTwo) {
    detailedRestaurants = detailedRestaurants.filter(restaurant => 
      restaurant.averageCostForTwo >= parseFloat(minCostForTwo)
    );
  }

  if (maxCostForTwo) {
    detailedRestaurants = detailedRestaurants.filter(restaurant => 
      restaurant.averageCostForTwo <= parseFloat(maxCostForTwo)
    );
  }

  // Sort by specified criteria
  detailedRestaurants.sort((a, b) => {
    if (sort === 'Cost:Low to High') {
      return (a.averageCostForTwo || 0) - (b.averageCostForTwo || 0);
    } else if (sort === 'Cost:High to Low') {
      return (b.averageCostForTwo || 0) - (a.averageCostForTwo || 0);
    } else if (sort === 'Rating:Low to High') {
      return (a.rating || 0) - (b.rating || 0);
    } else if (sort === 'Rating:High to Low') {
      return (b.rating || 0) - (a.rating || 0);
    } else if (sort === 'distance') {
      return (a.distanceInKm || Infinity) - (b.distanceInKm || Infinity);
    }
    return (b.relevanceScore || 0) - (a.relevanceScore || 0);
  });

  return detailedRestaurants;
};

const getDeliveryFilteredRestaurants = async (req, res) => {
  // const normalizedParams = normalizeRequestParams(req.query);

  let {latitude, longitude} = req.query;

  if (!latitude || !longitude) {
    return res.status(400).json({ error: 'Missing required query parameters: latitude and longitude' });
  }

  try {
    const filteredRestaurants = await getDeliveryFilteredRestaurants2(req.query);
    res.status(200).json({ message: 'Restaurants fetched successfully', data: filteredRestaurants });
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

const getDiningFilteredRestaurants2 = async (filters) => {
  let { latitude, longitude, minRadius, maxRadius, foodType, sort, diningCategory, minCostForTwo, maxCostForTwo } = filters;
  
  let minR = 0;
  let maxR = 5;

  if (minRadius && maxRadius) {
    minR = minRadius ? parseFloat(minRadius) : 0;
    maxR = maxRadius ? parseFloat(maxRadius) : 100;
  }

  const nearbyRestaurants = await findRestaurantsWithinRadius(parseFloat(latitude), parseFloat(longitude), minR, maxR);

  const restaurantIds = nearbyRestaurants.map(restaurant => restaurant.restaurantId);
  const restaurantDistances = {};
  nearbyRestaurants.forEach(restaurant => {
      restaurantDistances[restaurant.restaurantId] = restaurant.distanceInKm;
  });

  const restaurantDetails = await getRestaurantDetails(restaurantIds);

  let detailedRestaurants = restaurantDetails.map(detail => {
    const nearbyRestaurant = nearbyRestaurants.find(nearby => nearby.restaurantId.toString() === detail._id.toString());
    return {
      id: detail._id.toString(),
      name: detail.name,
      rating: detail.rating,
      numberOfRatings: detail.numberOfRatings,
      distanceInKm: nearbyRestaurant ? nearbyRestaurant.distanceInKm : null,
      cuisines: detail.cuisines,
      diningCategories: detail.diningCategories,
      address: detail.address,
      averageCostForTwo: detail.avgCosts[2] || 'N/A',
      images: detail.images,
      mainImage: detail.mainImage,
      foodType: detail.foodType,
      reviews: detail.reviews,
      modeSupported: detail.modeSupported,
      relevanceScore: calculateRelevanceScore(detail, restaurantDistances[detail._id.toString()], 'restaurant')
    };
  });

  // Filter by modeSupported to include only dining
  detailedRestaurants = detailedRestaurants.filter(restaurant => restaurant.modeSupported.includes('dining'));

  // Filter by foodType if specified and not 'Non Veg'
  if (foodType) {
    detailedRestaurants = detailedRestaurants.filter(restaurant => 
      restaurant.foodType.some(type => type.toLowerCase() === foodType.toLowerCase())
    );
  }

  // Filter by diningCategory if specified
  if (diningCategory) {
    detailedRestaurants = detailedRestaurants.filter(restaurant => restaurant.diningCategories.includes(diningCategory));
  }

  // Filter by cost range if specified
  if (minCostForTwo || maxCostForTwo) {
    detailedRestaurants = detailedRestaurants.filter(restaurant => {
      const cost = restaurant.averageCostForTwo;
      return (!minCostForTwo || cost >= parseFloat(minCostForTwo)) && (!maxCostForTwo || cost <= parseFloat(maxCostForTwo));
    });
  }

  // Sort by specified criteria
  detailedRestaurants.sort((a, b) => {
    if (sort === 'Cost:Low to High') {
      return (a.averageCostForTwo || 0) - (b.averageCostForTwo || 0);
    } else if (sort === 'Cost:High to Low') {
      return (b.averageCostForTwo || 0) - (a.averageCostForTwo || 0);
    } else if (sort === 'Rating:Low to High') {
      return (a.rating || 0) - (b.rating || 0);
    } else if (sort === 'Rating:High to Low') {
      return (b.rating || 0) - (a.rating || 0);
    } else if (sort === 'distance') {
      return (a.distanceInKm || Infinity) - (b.distanceInKm || Infinity);
    }
    return (b.relevanceScore || 0) - (a.relevanceScore || 0);
  });

  return detailedRestaurants;
};

const getDiningFilteredRestaurants = async (req, res) => {
  let {latitude, longitude,radius} = req.query;

  if (!latitude || !longitude) {
    return res.status(400).json({ error: 'Missing required query parameters: latitude and longitude' });
  }
  req.query.latitude = parseCoordinate(latitude, 3);
  req.query.longitude = parseCoordinate(longitude, 3);
  if(radius)req.query.radius=parseFloat(radius);
  try {
    const filteredRestaurants = await getDiningFilteredRestaurants2(req.query);
    res.status(200).json({ message: 'Restaurants fetched successfully', data: filteredRestaurants });
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

const getAllOutlets2 = async (latitude, longitude, restaurantId) => {
  // Find the brandId using the restaurantId
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) {
    throw new Error('Restaurant not found');
  }
  const brandId = restaurant.brandId;

  const radiusQueries = [
    { min: 0, max: 5 },
    { min: 5, max: 100 }
  ];

  let allNearbyRestaurants = [];
  const restaurantSet = new Set();

  for (const { min, max } of radiusQueries) {
    const nearbyRestaurants = await findRestaurantsWithinRadius(latitude, longitude, min, max);
    nearbyRestaurants.forEach(restaurant => {
      if (!restaurantSet.has(restaurant.restaurantId.toString()) && restaurant.restaurantId.toString() !== restaurantId) {
        restaurantSet.add(restaurant.restaurantId.toString());
        allNearbyRestaurants.push(restaurant);
      }
    });
  }

  // Create a map of restaurant distances and times
  const restaurantDistances = {};
  const restaurantTimes = {};
  
  allNearbyRestaurants.forEach(restaurant => {
    restaurantDistances[restaurant.restaurantId] = restaurant.distanceInKm;
    restaurantTimes[restaurant.restaurantId] = restaurant.timeInMinutes;
  });

  // Get restaurant details using the cached function
  const restaurantIds = allNearbyRestaurants.map(r => r.restaurantId);
  const detailedRestaurants = await getRestaurantDetails(restaurantIds);

  // Filter restaurants by brandId
  const filteredRestaurants = detailedRestaurants.filter(restaurant => 
    restaurant.brandId.toString() === brandId.toString()
  );

  // Map filtered restaurants with distance and time
  const branchesWithDistanceAndTime = filteredRestaurants.map(restaurant => {
    return {
      name: restaurant.name,
      images: restaurant.images,
      mainImage: restaurant.mainImage,
      rating: restaurant.rating,
      distance: restaurantDistances[restaurant._id.toString()],
      averageCostForTwo: restaurant.avgCosts[2] || 'N/A',
      time: restaurantTimes[restaurant._id.toString()] // Include time in minutes
    };
  });

  // Sort branches by distance
  branchesWithDistanceAndTime.sort((a, b) => a.distance - b.distance);

  return branchesWithDistanceAndTime;
};
  
const getAllOutlets = async (req, res) => {
  const { latitude, longitude, restaurantId } = req.query;
  if (!latitude || !longitude || !restaurantId) {
    return res.status(400).send('Missing required query parameters: latitude, longitude, restaurantId');
  }

  try {
    const outlets = await getAllOutlets2(parseFloat(latitude), parseFloat(longitude), restaurantId);
    res.status(200).json({ message: 'Restaurants fetched successfully', data: outlets });
  } catch (error) {
    console.error('Error fetching branches:', error);
    res.status(500).send('Internal Server Error');
  }
}

const getSimilarRestaurants2 = async (latitude, longitude, restaurantId, minRadiusQuery, maxRadiusQuery) => {
  const minRadius = parseFloat(minRadiusQuery || 0); // Default minRadius to 0
  const maxRadius = parseFloat(maxRadiusQuery || 10); // Default maxRadius to 10

  // Parse coordinates to three decimal places for consistency
  const parsedLatitude = parseFloat(latitude).toFixed(3);
  const parsedLongitude = parseFloat(longitude).toFixed(3);

  // Generate cache key
  const cacheKey = `similarRestaurants:${parsedLatitude}:${parsedLongitude}:${restaurantId}`;

  // Check if the data is already in the cache
  let cachedData = await CachedData.findOne({ key: cacheKey });
  if(cachedData){cachedData=cachedData.value;}
  if (cachedData) {
    return JSON.parse(cachedData);
  }

  // Fetch the input restaurant's details
  const inputRestaurant = await Restaurant.findById(restaurantId);
  if (!inputRestaurant) {
    throw new Error('Restaurant not found');
  }

  const { cuisines, diningCategories } = inputRestaurant._doc;

  // Find nearby restaurants using the findRestaurantsWithinRadius function
  const nearbyRestaurants = await findRestaurantsWithinRadius(parsedLatitude, parsedLongitude, minRadius, maxRadius);

  // Get detailed information of the nearby restaurants
  const restaurantIds = nearbyRestaurants.map(r => r.restaurantId);
  const detailedRestaurants = await getRestaurantDetails(restaurantIds);

  // Filter similar restaurants based on matching cuisines and dining categories
  const similarRestaurants = detailedRestaurants
    .filter(restaurant => restaurant._id.toString() !== restaurantId) // Exclude the input restaurant
    .map(restaurant => {
      const { _doc: detail } = restaurant;
      let score = 0;
      const matchingCuisines = detail.cuisines.filter(cuisine => cuisines.includes(cuisine));
      const matchingDiningCategories = detail.diningCategories.filter(category => diningCategories.includes(category));
      score += matchingCuisines.length + matchingDiningCategories.length;
      return {
        id: detail._id.toString(), // Ensure ID is included
        name: detail.name,
        rating: detail.rating,
        distanceInKm: nearbyRestaurants.find(nearby => nearby.restaurantId.toString() === detail._id.toString())?.distanceInKm || null,
        cuisines: detail.cuisines,
        address: detail.address,
        averageCostForTwo: detail.avgCosts[2] || 'N/A', // Rename field and handle missing data
        images: detail.images,
        mainImage: detail.mainImage,
        foodType: detail.foodType,
        relevanceScore: score
      };
    });

  // Sort the similar restaurants by their similarity score in descending order
  similarRestaurants.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Store the results in the cache for 24 hours (86400 seconds)
  await CachedData.create({ key: cacheKey, value: JSON.stringify(similarRestaurants) });

  // Return the sorted restaurants
  return similarRestaurants;
};


const getSimilarRestaurants = async (req, res) => {
  const { latitude, longitude, restaurantId } = req.query;
  if (!latitude || !longitude || !restaurantId) {
    return res.status(400).send('Missing required query parameters: latitude, longitude, restaurantId');
  }
  
  const minRadius = parseFloat(req.query.minRadius || 0);
  const maxRadius = parseFloat(req.query.maxRadius || 10);

  try {
    const similarRestaurants = await getSimilarRestaurants2(latitude, longitude, restaurantId, minRadius, maxRadius);
    res.status(200).json({ message: 'Restaurants fetched successfully', data: similarRestaurants });
  } catch (error) {
    console.error('Error fetching similar restaurants:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}

const createRating = async (req, res) => {
  try {
    const { userId, restaurantId, restaurantRating, reviewText, foodItemRatings } = req.body;

    // Update restaurant rating
    const restaurant = await Restaurant.findById(restaurantId);
    const currentRestaurantTotalRating = restaurant.rating * restaurant.numberOfRatings;
    const newRestaurantNumberOfRatings = restaurant.numberOfRatings + 1;
    const newRestaurantTotalRating = currentRestaurantTotalRating + restaurantRating;
    const newRestaurantAvgRating = (newRestaurantTotalRating / newRestaurantNumberOfRatings).toFixed(1);

    restaurant.rating = newRestaurantAvgRating;
    restaurant.numberOfRatings = newRestaurantNumberOfRatings;
    if (reviewText) {
      restaurant.reviews += 1;
    }
    await restaurant.save();

    // Update food items rating
    for (const foodItemRating of foodItemRatings) {
      const foodItem = await FoodItem.findById(foodItemRating.foodItemId);
      const currentFoodItemTotalRating = foodItem.rating * foodItem.numberOfRatings;
      const newFoodItemNumberOfRatings = foodItem.numberOfRatings + 1;
      const newFoodItemTotalRating = currentFoodItemTotalRating + foodItemRating.rating;
      const newFoodItemAvgRating = (newFoodItemTotalRating / newFoodItemNumberOfRatings).toFixed(1);

      foodItem.rating = newFoodItemAvgRating;
      foodItem.numberOfRatings = newFoodItemNumberOfRatings;
      if (reviewText) {
        foodItem.reviews += 1;
      }
      await foodItem.save();
    }

    res.status(201).json({ message: 'Rating created successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Helper function to calculate the start date for the past 7 days
const getStartDate = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lastWeek = new Date(today);
  lastWeek.setDate(today.getDate() - 7);
  return lastWeek;
};

const getPopularRestaurants = async (req, res) => {
  const { latitude, longitude, minRadius, maxRadius } = req.query;

  // Round latitude and longitude to 2 decimal places for caching
  const roundedLatitude = parseCoordinate(parseFloat(latitude), 2);
  const roundedLongitude = parseCoordinate(parseFloat(longitude), 2);

  // Generate cache key for popular restaurants
  const cacheKey = `popularRestaurants:${roundedLatitude}:${roundedLongitude}:${minRadius}:${maxRadius}`;
  console.log("cacheKey", cacheKey);

  try {
    // Check if cached data exists
    // let cachedData = await CachedData.findOne({ key: cacheKey });
    // if (cachedData) cachedData = cachedData.value;
    // if (cachedData) {
    //   return res.status(200).json({
    //     message: 'Popular restaurants fetched successfully from cache',
    //     data: JSON.parse(cachedData)
    //   });
    // }

    // Step 1: Find nearby restaurants
    const nearbyRestaurants = await findRestaurantsWithinRadius(
      roundedLatitude, 
      roundedLongitude, 
      parseFloat(minRadius), 
      parseFloat(maxRadius)
    );

    const restaurantIds = nearbyRestaurants.map(restaurant => restaurant.restaurantId);

    // Convert restaurant IDs to ObjectId
    const objectIdRestaurantIds = restaurantIds.map(id => new mongoose.Types.ObjectId(id));

    // Aggregate order data
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const pipeline = [
      {
        $match: {
          restaurantId: { $in: objectIdRestaurantIds },
          // placedOn: { $gte: oneWeekAgo }
        }
      },
      {
        $group: {
          _id: '$restaurantId',
          totalOrders: { $sum: 1 },
          totalAmount: { $sum: '$total' }
        }
      },
      {
        $project: {
          restaurantId: '$_id',
          totalOrders: 1,
          totalAmount: 1
        }
      }
    ];

    const orderResults = await Order.aggregate(pipeline);
    const popularRestaurantsData = orderResults.map(result => ({
      restaurantId: result.restaurantId.toString(),
      totalOrders: result.totalOrders,
      totalAmount: result.totalAmount
    }));

    // Extract popular restaurant IDs
    const popularRestaurantIds = popularRestaurantsData.map(data => data.restaurantId);

    // Step 3: Fetch restaurant details for all nearby restaurants
    const restaurantDetails = await getRestaurantDetails(restaurantIds);

    // Step 4: Merge and sort data
    let detailedRestaurants = restaurantDetails.map(detail => {
      const nearbyRestaurant = nearbyRestaurants.find(nearby => nearby.restaurantId.toString() === detail._id.toString());
      const popularData = popularRestaurantsData.find(data => data.restaurantId.toString() === detail._id.toString());

      return {
        id: detail._id.toString(),
        name: detail.name,
        rating: detail.rating,
        numberOfRatings: detail.numberOfRatings,
        distanceInKm: nearbyRestaurant ? nearbyRestaurant.distanceInKm : null,
        cuisines: detail.cuisines,
        diningCategories: detail.diningCategories,
        address: detail.address,
        averageCostForTwo: detail.avgCosts[2] || 'N/A',
        images: detail.images,
        mainImage: detail.mainImage,
        foodType: detail.foodType,
        reviews: detail.reviews,
        modeSupported: detail.modeSupported,
        totalOrders: popularData ? popularData.totalOrders : 0,
        totalAmount: popularData ? popularData.totalAmount : 0
      };
    });

    // Step 5: Sort by totalOrders and totalAmount
    detailedRestaurants.sort((a, b) => {
      // Sort by totalOrders first, and by totalAmount if orders are equal
      if (b.totalOrders === a.totalOrders) {
        return b.totalAmount - a.totalAmount;
      }
      return b.totalOrders - a.totalOrders;
    });

    // Step 6: Cache the results
    // await CachedData.create({ key: cacheKey, value: JSON.stringify(detailedRestaurants) });

    res.status(200).json({
      message: 'Popular restaurants fetched successfully',
      data: detailedRestaurants
    });
  } catch (error) {
    console.error("Error getting popular restaurants:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get Categories with their counts for a specific Restaurant
const getMenuCategoriesWithCounts = async (req, res) => {
  try {
    const { id } = req.params;

    const categories = await FoodItem.aggregate([
      { $match: { restaurantId: new mongoose.Types.ObjectId(id) } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

module.exports = {
  getRestaurantDetails,
  findRestaurantsWithinRadius,
  createRestaurant,
  getFilteredRestaurants,
  getRestaurantById,
  updateRestaurant,
  deleteRestaurant,
  giveRatingToRestaurant,
  RestaurantController,
  getPopularCuisinesNearby,
  getPopularDiningCatergoriesNearby,
  getPopularLocationsNearby,
  getDeliveryFilteredRestaurants,
  getDiningFilteredRestaurants,
  getAllOutlets,
  getSimilarRestaurants,
  createRating,
  getRestaurantDetailsWithFoodItems,
  getPopularRestaurants,
  getMenuCategoriesWithCounts
};