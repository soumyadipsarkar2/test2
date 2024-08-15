const Restaurant = require('../models/restaurant');
const FoodItem = require('../models/foodItem');
const CachedData = require('../models/cachedData');
const { getUserLikedVideos2 } = require('./userLikeController');
const matrixClient = require('@mapbox/mapbox-sdk/services/matrix');
const mbxMatrix = matrixClient({ accessToken: 'pk.eyJ1Ijoic291bXlhZGlwc2Fya2FyIiwiYSI6ImNseWN6OHNzazAwcHkybXF5NWd2b3N0MTUifQ.Utd-JffEznqet-j2GKNX7g' });
const { getOffersForRestaurant,getOffersForFoodItem } = require('./offerController');
const { getVideosForRestaurant,getVideosForFoodItem } = require('./videoController');

const calculateRelevanceScore = (item, distance, type) => {
  let score = 0;

  if (type === 'restaurant') {
      score += item.rating * 0.4; // Rating contributes 40%
      score += item.reviews * 0.3; // Number of reviews contributes 30%
      score += (1 / (distance + 1)) * 0.2; // Distance contributes 20%
      score += item.numberOfRatings * 0.1; // Popularity contributes 10% (this can be based on likes, social media presence, etc.)
  } else if (type === 'foodItem') {
      score += item.rating * 0.4; // Rating contributes 40%
      score += item.reviews * 0.3; // Number of reviews contributes 30%
      score += (1 / (distance + 1)) * 0.2; // Distance contributes 20%
      score += item.numberOfRatings * 0.1; // Number of ratings contributes 10%
  }

  return score;
}

const parseCoordinate = (value, digits) => {
    const factor = Math.pow(10, digits);
    return Math.round(value * factor) / factor;
};

const generateCacheKey = (latitude, longitude,minRadius,maxRadius) => {
    return `restaurants:${latitude}:${longitude}:${minRadius}:${maxRadius}`;
};

const findRestaurantsWithinRadius=async (latitude, longitude, minRadius, maxRadius)=>{
    const parsedLatitude = parseCoordinate(latitude, 3);
    const parsedLongitude = parseCoordinate(longitude, 3);
    const minRadiusInMeters = minRadius * 1000;
    const maxRadiusInMeters = maxRadius * 1000;
  
    const cacheKey = generateCacheKey(parsedLatitude, parsedLongitude, minRadius, maxRadius);
    console.log("cacheKey", cacheKey);
  
    let cachedData = await CachedData.findOne({ key: cacheKey });
    if(cachedData){cachedData=cachedData.value;}
    if (cachedData) {
      console.log("cacheKey1324243242423", cacheKey);
      return JSON.parse(cachedData);
    }
  
    // Step 1: Fetch restaurants within the max radius using MongoDB's geospatial query
    const maxRadiusRestaurants = await Restaurant.find({
      'location.coordinates': {
        $geoWithin: {
          $centerSphere: [[parsedLongitude, parsedLatitude], maxRadiusInMeters / 6378100] // Radius in radians
        }
      }
    }, { _id: 1, location: 1 });
  
    let allNearbyRestaurants = maxRadiusRestaurants;
  
    if (minRadius > 0) {
      // Step 2: Fetch restaurants within the min radius using MongoDB's geospatial query
      const minRadiusRestaurants = await Restaurant.find({
        'location.coordinates': {
          $geoWithin: {
            $centerSphere: [[parsedLongitude, parsedLatitude], minRadiusInMeters / 6378100] // Radius in radians
          }
        }
      }, { _id: 1, location: 1 });
  
      // Convert the minRadiusRestaurants to a Set of IDs for quick lookup
      const minRadiusRestaurantIds = new Set(minRadiusRestaurants.map(restaurant => restaurant._id.toString()));
  
      // Filter out restaurants within the minRadius from the maxRadiusRestaurants
      allNearbyRestaurants = maxRadiusRestaurants.filter(restaurant => 
        !minRadiusRestaurantIds.has(restaurant._id.toString())
      );
    }
  
    try {
      // Prepare coordinates for Mapbox Matrix API
      const coordinates = allNearbyRestaurants.map(restaurant => ({
        coordinates: restaurant.location.coordinates
      }));
      coordinates.unshift({ coordinates: [parsedLongitude, parsedLatitude] }); // Add the user location as the first coordinate
  
      // Step 3: Use Mapbox Matrix API to calculate distances and durations
      const matrixResponse = await mbxMatrix.getMatrix({
        points: coordinates,
        profile: 'driving',
        annotations: ['distance', 'duration']
      }).send();
  
      const distances = matrixResponse.body.distances[0]; // Distances from the user to each restaurant
      const durations = matrixResponse.body.durations[0]; // Durations from the user to each restaurant
  
      // Step 4: Filter and map distances to restaurants, keeping those within the specified range
      const restaurantsWithDistancesAndTimes = allNearbyRestaurants
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
  
      // Step 5: Cache the results
      await CachedData.create({ key: cacheKey, value: JSON.stringify(restaurantsWithDistancesAndTimes) });
      return restaurantsWithDistancesAndTimes;
    } catch (error) {
      console.error('Error fetching nearby restaurants:', error);
      throw error;
    }
}

const getFeed = async (req, res) => {
    const {
        latitude,
        longitude,
        minRadius=0,
        maxRadius=5,
        sort = 'relevance',
        mode = 'delivery',
        foodType = 'Veg',
        userId,
        cuisines = [], // Array of selected cuisines
        rating = '', // Example: '4.5+', '4.0+', '3.5+'
        minCostForTwo = 0, // Minimum cost for two
        maxCostForTwo = Infinity // Maximum cost for two
    } = req.query;

    try {
        // Find nearby restaurants
        const nearbyRestaurants = await findRestaurantsWithinRadius(
            parseFloat(latitude),
            parseFloat(longitude),
            parseFloat(minRadius),
            parseFloat(maxRadius)
        );

        let restaurantIds = nearbyRestaurants.map(r => r.restaurantId);
        const restaurantDistances = {};
        nearbyRestaurants.forEach(restaurant => {
            restaurantDistances[restaurant.restaurantId] = restaurant.distanceInKm;
        });

        // Fetch restaurant and food item details
        let restaurants = await Restaurant.find({ _id: { $in: restaurantIds } });
        const userLikedVideos = await getUserLikedVideos2(userId);

        // Filter by food type if specified
        if (foodType && foodType === "Veg") {
            restaurants = restaurants.filter(restaurant => restaurant.foodType.includes(foodType));
            // foodItems = foodItems.filter(foodItem => foodItem.type === foodType);
        }

        // Filter restaurants by mode if specified
        if (mode) {
            restaurants = restaurants.filter(restaurant => restaurant.modeSupported.includes(mode));
        }

        // Filter by rating if specified
        if (rating) {
            const minRating = parseFloat(rating);
            restaurants = restaurants.filter(restaurant => restaurant.rating >= minRating);
            // foodItems = foodItems.filter(foodItem => foodItem.rating >= minRating);
        }

        // Filter by cost for two if specified
        restaurants = restaurants.filter(restaurant => {
            const costForTwo = restaurant.avgCosts["2"]; // Assuming '2' represents cost for two people
            return costForTwo >= minCostForTwo && costForTwo <= maxCostForTwo;
        });

        // Update restaurantIds to include only those from the filtered list
        restaurantIds = restaurants.map(restaurant => restaurant._id);

        // Filter by cuisines if specified
        let foodItems = await FoodItem.find({ restaurantId: { $in: restaurantIds } });
        if (cuisines.length > 0) {
            const cuisinesArray = cuisines.split(',').map(cuisine => cuisine.trim());
            restaurants = restaurants.filter(restaurant => cuisinesArray.some(cuisine => restaurant.cuisines.includes(cuisine)));
            foodItems = foodItems.filter(foodItem => cuisinesArray.some(cuisine => foodItem.cuisines.includes(cuisine)));
        }

        // if(minCostForTwo!=0||maxCostForTwo!=Infinity)
        // {
        //     // Filter food items based on cost for two of their associated restaurant
        //     foodItems = foodItems.filter(foodItem => {
        //         return restaurants.find(r => r._id.equals(foodItem.restaurantId));
        //     });
        // }

        // Create dining responses (equivalent to restaurant responses)
        const diningResponses = await Promise.all(
            restaurants.map(async restaurant => {
                const offers = await getOffersForRestaurant(restaurant._id.toString());
                const videos = await getVideosForRestaurant(restaurant._id.toString());
                const distance = restaurantDistances[restaurant._id.toString()];

                return {
                    type: 'dining',
                    restaurantId: restaurant._id,
                    restaurantName: restaurant.name,
                    distance: distance,
                    distanceUnit: 'Km',
                    foodTypes: restaurant.cuisines,
                    spendCost: restaurant.avgCosts['2'], // Adjusted to the new avgCosts format
                    numberOfPeople: 2, // Fixed number since it's for two people
                    address: `${restaurant.address.streetAddress}, ${restaurant.address.city}`,
                    rating: restaurant.rating,
                    foodType: restaurant.foodType,
                    offers: offers.map(offer => ({
                        type: 'discount',
                        value: offer.description
                    })),
                    ctaText: 'Book Now',
                    videosData: videos.map(video => ({
                        videoId: video._id,
                        videoLink: video.link,
                        likes: video.likes,
                        liked: userLikedVideos.includes(video._id.toString()),
                        comments: video.comments
                    })),
                    relevanceScore: calculateRelevanceScore(restaurant, distance, 'restaurant')
                };
            })
        );

        // Create delivery responses by aggregating food item videos under their restaurants
        const deliveryResponses = [];
        const restaurantMap = {};

        // Add food item videos to the corresponding restaurant
        await Promise.all(
            foodItems.map(async foodItem => {
                const offers = await getOffersForFoodItem(foodItem._id.toString());
                const videos = await getVideosForFoodItem(foodItem._id.toString());
                const restaurantId = foodItem.restaurantId.toString();

                // Ensure restaurant is in the map
                if (!restaurantMap[restaurantId]) {
                    const restaurant = await Restaurant.findById(restaurantId);
                    if (restaurant) {
                        restaurantMap[restaurantId] = {
                            type: 'delivery',
                            restaurantId: restaurant._id,
                            restaurantName: restaurant.name,
                            distance: restaurantDistances[restaurant._id.toString()],
                            distanceUnit: 'Km',
                            address: `${restaurant.address.streetAddress}, ${restaurant.address.city}`,
                            restaurantRating: restaurant.rating,
                            restaurantFoodType: restaurant.foodType,
                            spendCost: restaurant.avgCosts['2'],
                            ctaText: 'Order Now',
                            videosData: [],
                            relevanceScore: calculateRelevanceScore(restaurant, restaurantDistances[restaurant._id.toString()], 'restaurant')
                        };
                    }
                }

                // Add food item videos to the restaurant's deliveryVideosData
                if (restaurantMap[restaurantId]) {
                    const foodItemVideosData = videos.map(video => ({
                        videoId: video._id,
                        videoLink: video.link,
                        cost: foodItem.discountedCost,
                        foodType: foodItem.type,
                        likes: video.likes,
                        liked: userLikedVideos.includes(video._id.toString()),
                        comments: video.comments,
                        rating: foodItem.rating,
                        offers: offers.map(offer => ({
                            type: 'discount',
                            value: offer.description
                        }))
                    }));

                    restaurantMap[restaurantId].videosData.push(...foodItemVideosData);
                }
            })
        );

        // Convert restaurantMap to an array of delivery responses
        Object.values(restaurantMap).forEach(restaurant => {
            deliveryResponses.push(restaurant);
        });

        switch (sort) {
            case 'Relevance':
                deliveryResponses.sort((a, b) => b.relevanceScore - a.relevanceScore);
                diningResponses.sort((a, b) => b.relevanceScore - a.relevanceScore);
                break;
            case 'Rating':
                deliveryResponses.sort((a, b) => b.restaurantRating - a.restaurantRating);
                diningResponses.sort((a, b) => b.rating - a.rating);
                break;
            case 'Cost:Low to High':
                deliveryResponses.sort((a, b) => parseInt(a.spendCost) - parseInt(b.spendCost));
                diningResponses.sort((a, b) => parseInt(a.spendCost) - parseInt(b.spendCost));
                break;
            case 'Cost:High to Low':
                deliveryResponses.sort((a, b) => parseInt(b.spendCost) - parseInt(a.spendCost));
                diningResponses.sort((a, b) => parseInt(b.spendCost) - parseInt(a.spendCost));
                break;
            default:
                // Default sorting by relevance
                deliveryResponses.sort((a, b) => b.relevanceScore - a.relevanceScore);
                diningResponses.sort((a, b) => b.relevanceScore - a.relevanceScore);
                break;
        }

        // Filter and sort the final response based on the mode
        let finalResponses=[...deliveryResponses,...diningResponses];
        if (mode === 'dining') {
            finalResponses = [...diningResponses,...deliveryResponses];
        }

        res.status(200).json({ message: 'Feed fetched successfully', data: finalResponses });
    } catch (err) {
        res.status(500).send({ message: 'Error retrieving feed', error: err.message });
    }
}

module.exports = {
  getFeed,
  calculateRelevanceScore
};