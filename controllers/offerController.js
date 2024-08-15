// controllers/offerController.js
const Offer = require('../models/offer');
const Restaurant = require('../models/restaurant');
const { findRestaurantsWithinRadius } = require('./restaurantController');
const { getFoodItemDetails } = require('./foodItemController');

// Create a new offer
const createOffer = async (req, res) => {
  const { type, description, restaurantId, endDate, startDate, conditions, foodItemId,imageLink,amount } = req.body;

  // Determine status based on startDate and endDate
  let status;

  if (startDate == null && endDate == null) {
    status = 'inactive';
  } else if (startDate == null && endDate != null) {
    return res.status(400).json({ message: 'Invalid date combination: startDate cannot be null if endDate is provided.' });
  } else if (startDate != null && endDate == null) {
    console.log("startDate != null && endDate == null");
    const currentTime = Math.floor(Date.now()/1000);
    if (currentTime < startDate) {
      status = 'inactive';
    } else {
      status = 'active';
    }
  } else if (startDate != null && endDate != null) {
    console.log("startDate != null && endDate != null");
    const currentTime = Math.floor(Date.now()/1000);
    if (currentTime < startDate) {
      status = 'inactive';
    } else if (currentTime >= startDate && currentTime <= endDate) {
      status = 'active';
    } else {
      status = 'expired';
    }
  }

  // Create new offer object
  const newOffer = new Offer({
    type,
    description,
    restaurantId,
    endDate,
    startDate,
    conditions,
    foodItemId,
    status,
    imageLink,
    amount
  });

  try {
    // Save the offer to the database
    const savedOffer = await newOffer.save();
    res.status(201).json({ message: 'Offer created successfully', data: savedOffer });
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

// Function to get offers based on filters
const getOffers2 = async (filters) => {
  const {
    restaurantId,
    foodItemId,
    userId,
    imageOffers = false,
    status,
    type,
    startDate,
    endDate,
    latitude,
    longitude,
    minRadius = 0,
    maxRadius = 10
  } = filters;

  const query = {};

  // Filter by restaurantId if provided
  if (restaurantId) {
    query.restaurantId = restaurantId;
  }

  // Filter by foodItemId if provided
  if (foodItemId) {
    query.foodItemId = foodItemId;
  }

  // Filter by userId if provided
  if (userId) {
    query.userId = userId;
  }

  // Filter by imageOffers if true
  if (imageOffers) {
    query.imageLink = { $ne: null }; // Assuming imageLink should not be null
  }

  // Filter by status if provided
  if (status !== undefined) {
    query.status = status;
  }

  // Filter by startDate and endDate if provided
  if (startDate && !endDate) {
    query.startDate = { $gte: startDate };
  } else if (!startDate && endDate) {
    throw new Error('StartDate cannot be null when EndDate is provided');
  } else if (startDate && endDate) {
    query.startDate = { $gte: startDate };
    query.endDate = { $lte: endDate };
  }

  try {
    // Fetch offers from MongoDB
    const offers = await Offer.find(query);

    // Extract unique restaurant and food item IDs from offers
    const offerRestaurantIds = [...new Set(offers.map(offer => offer.restaurantId.toString()))];
    const offerFoodItemIds = [...new Set(offers.map(offer => offer.foodItemId ? offer.foodItemId.toString() : null).filter(id => id))];

    // Get restaurant details for the relevant restaurant IDs
    const restaurantDetailsArray = await getRestaurantDetails(offerRestaurantIds);
    const restaurantDetailsMap = new Map(restaurantDetailsArray.map(r => [r._id.toString(), r]));

    // Get food item details for the relevant food item IDs
    const foodItemDetailsArray = await getFoodItemDetails(offerFoodItemIds);
    const foodItemDetailsMap = new Map(foodItemDetailsArray.map(f => [f._id.toString(), f]));

    // Format the offers with restaurant name and food item name using the maps
    const formattedOffers = offers.map(offer => {
      const restaurant = restaurantDetailsMap.get(offer.restaurantId.toString());
      const foodItem = foodItemDetailsMap.get(offer.foodItemId ? offer.foodItemId.toString() : '');

      return {
        ...offer._doc,
        restaurantName: restaurant ? restaurant.name : null,
        foodItemName: foodItem ? foodItem.name : null,
        validForDays: offer.endDate ? Math.ceil((offer.endDate - Date.now() / 1000) / (60 * 60 * 24)) : null
      };
    });

    return formattedOffers;
  } catch (error) {
    console.error('Error fetching offers:', error);
    throw error;
  }
};

// Read (Get) all offers
const getOffers = async (req, res) => {
  try {

    const normalizedParams = normalizeRequestParams(req.query);
    const filters = normalizedParams;

    // Ensure latitude and longitude are included if nearby is true
    // if (filters.nearby && (!filters.latitude || !filters.longitude)) {
    //   return res.status(400).json({ message: 'Latitude and longitude are required for nearby offers' });
    // }

    filters.imageOffers=filters.imageOffers==='true';
    // filters.nearby=filters.nearby==='true';

    // Call the function to get filtered offers
    const offers = await getOffers2(filters);

    // Respond with the offers
    res.status(200).json({ message: 'Offers retrieved successfully', data: offers });
  } catch (error) {
    console.error('Error getting offers:', error);
    res.status(500).json({ message: 'Error retrieving offers', error: error.message });
  }
};

// Read (Get) an offer by ID
const getOfferById = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ message: 'Offer not found', data: null });
    res.status(200).json({ message: 'Offer retrieved successfully', data: offer });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

// Update an offer by ID
const updateOffer = async (req, res) => {
  try {
    const updatedOffer = await Offer.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedOffer) return res.status(404).json({ message: 'Offer not found', data: null });
    res.status(200).json({ message: 'Offer updated successfully', data: updatedOffer });
  } catch (error) {
    res.status(400).json({ message: error.message, data: null });
  }
};

// Delete an offer by ID
const deleteOffer = async (req, res) => {
  try {
    const deletedOffer = await Offer.findByIdAndDelete(req.params.id);
    if (!deletedOffer) return res.status(404).json({ message: 'Offer not found', data: null });
    res.status(200).json({ message: 'Offer deleted successfully', data: deletedOffer });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

async function getOffersForRestaurant(restaurantId) {
  return await Offer.find({ type: 'restaurant',restaurantId });
}

const getOffersForFoodItem = async (foodItemId) => {
  return Offer.find({ type: 'foodItem', foodItemId });
};

async function getActiveOffers() {
  const currentDate = Date.now();
  return await Offer.find({ startDate: { $lte: currentDate }, endDate: { $gte: currentDate }, status: 'active' }).exec();
}

const calculateOfferAmount = async (offerIds) => {
  try {
    if (offerIds.length === 0) {
      return 0;
    }
    const offers = await Offer.find({ _id: { $in: offerIds }, status: 'active' });
    const totalOfferAmount = offers.reduce((sum, offer) => sum + offer.amount, 0);
    return 100;
  } catch (error) {
    throw new Error('Error calculating offer amount: ' + error.message);
  }
};

module.exports = {
  createOffer,
  getOffers,
  getOfferById,
  updateOffer,
  deleteOffer,
  getOffersForRestaurant,
  getOffersForFoodItem,
  getActiveOffers,
  calculateOfferAmount
};
