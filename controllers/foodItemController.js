// controllers/foodItemController.js
const FoodItem = require('../models/foodItem');
const Order = require('../models/order');

class FoodItemController {
  static async incrementReviewCount(foodItemId) {
    try {
      const updatedFoodItem = await FoodItem.findByIdAndUpdate(
        foodItemId,
        { $inc: { reviews: 1 } },
        { new: true, useFindAndModify: false }
      );

      if (!updatedFoodItem) {
        throw new Error('Food Item not found');
      }

      return updatedFoodItem;
    } catch (error) {
      console.error('Error incrementing review count:', error);
      throw error;
    }
  }
}

// Create a new food item
const createFoodItem = async (req, res) => {
  try {
    const newFoodItem = new FoodItem(req.body);
    const savedFoodItem = await newFoodItem.save();
    res.status(201).json({ message: 'Food item created successfully', data: savedFoodItem });
  } catch (error) {
    res.status(400).json({ message: error.message, data: null });
  }
};

// Read (Get) all food items
const getAllFoodItems = async (req, res) => {
  const { restaurantId, type, bestseller, rating, dietary, sortBy } = req.query;

  // Initialize filter criteria
  const filterCriteria = { restaurantId };
  
  if (type) filterCriteria.type = type;
  if (bestseller) filterCriteria.bestseller = true; // Assuming bestseller is a boolean field
  if (rating) {
    const ratingNumber = parseFloat(rating);
    if (ratingNumber >= 2 && ratingNumber <= 4) {
      filterCriteria.rating = { $gte: ratingNumber };
    }
  }
  if (dietary) {
    // Directly use the dietary preferences without converting to lowercase
    const dietaryPreferences = dietary.split(',').map(d => d.trim());
    filterCriteria.dietary = { $in: dietaryPreferences };
  }

  try {
    // Fetch food items based on filter criteria
    let foodItems = await FoodItem.find(filterCriteria);

    // Sort based on sortBy query parameter
    if (sortBy === 'priceAsc') {
      foodItems = foodItems.sort((a, b) => a.discountedCost - b.discountedCost);
    } else if (sortBy === 'priceDesc') {
      foodItems = foodItems.sort((a, b) => b.discountedCost - a.discountedCost);
    } else if (sortBy === 'ratingDesc') {
      foodItems = foodItems.sort((a, b) => b.rating - a.rating);
    }

    // Group food items by category
    const groupedFoodItems = foodItems.reduce((acc, item) => {
      const category = item.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {});

    res.status(200).json({
      message: 'Food items filtered and grouped successfully',
      data: groupedFoodItems
    });
  } catch (error) {
    console.error('Error filtering food items:', error);
    res.status(500).json({ message: 'Internal Server Error', data: null });
  }
};

// Read (Get) a food item by ID
const getFoodItemById = async (req, res) => {
  try {
    const foodItem = await FoodItem.findById(req.params.id);
    if (!foodItem) return res.status(404).json({ message: 'Food item not found', data: null });

    // Convert foodItem to a plain object to modify the response
    const foodItemObject = foodItem.toObject();

    // Remove discountedCost if it is 0
    if (foodItemObject.discountedCost === 0) {
      delete foodItemObject.discountedCost;
    }

    res.status(200).json({ message: 'Food item retrieved successfully', data: foodItemObject });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

// Update a food item by ID
const updateFoodItem = async (req, res) => {
  try {
    const updatedFoodItem = await FoodItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedFoodItem) return res.status(404).json({ message: 'Food item not found', data: null });
    res.status(200).json({ message: 'Food item updated successfully', data: updatedFoodItem });
  } catch (error) {
    res.status(400).json({ message: error.message, data: null });
  }
};

// Give a rating to a food item by ID
const giveRatingToFoodItem = async (req, res) => {
  const { rating } = req.body;
  const foodItemId = req.params.id;

  // Validate rating value (between 1 to 5)
  if (rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Rating must be between 1 and 5.' });
  }

  try {
    // Find the Food Item by ID
    const foodItem = await FoodItem.findById(foodItemId);

    if (!foodItem) {
      return res.status(404).json({ message: 'Food item not found.' });
    }

    // Calculate new average rating
    const currentTotalRating = foodItem.rating * foodItem.numberOfRatings;
    const newNumberOfRatings = foodItem.numberOfRatings + 1;
    let newAvgRating = (currentTotalRating + rating) / newNumberOfRatings;
    newAvgRating = Math.round(newAvgRating * 10) / 10;

    // Update food item document
    foodItem.rating = newAvgRating;
    foodItem.numberOfRatings = newNumberOfRatings;

    // Save updated food item
    await foodItem.save();

    // Respond with the updated rating and food item ID
    res.status(200).json({
      message: 'Rating added successfully.',
      data: {
        id: foodItem._id,
        rating: newAvgRating,
        numberOfRatings : newNumberOfRatings
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete a food item by ID
const deleteFoodItem = async (req, res) => {
  try {
    const deletedFoodItem = await FoodItem.findByIdAndDelete(req.params.id);
    if (!deletedFoodItem) return res.status(404).json({ message: 'Food item not found', data: null });
    res.status(200).json({ message: 'Food item deleted successfully', data: { id: deletedFoodItem._id } });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

// Function to get food item details based on IDs
const getFoodItemDetails = async (foodItemIds) => {
  const foodItemDetails = [];

  if (foodItemIds.length > 0) {
    const mongoResults = await FoodItem.find({ _id: { $in: foodItemIds } });

    mongoResults.forEach(result => {
      foodItemDetails.push(result);
    });
  }

  return foodItemDetails;
};

// Utility function to get matching score between two arrays
const getMatchingScore = (array1, array2) => {
  const set1 = new Set(array1.map(item => item.toString()));
  const set2 = new Set(array2.map(item => item.toString()));
  const intersection = new Set([...set1].filter(item => set2.has(item)));
  return intersection.size;
};

// Read (Get) all food items
const getSimilarFoodItems = async (req, res) => {
  try {
    const { foodItemIds } = req.body;

    if (!foodItemIds || !Array.isArray(foodItemIds) || foodItemIds.length === 0) {
      return res.status(400).json({ message: 'Invalid input: list of food items is required' });
    }

    // Find orders containing any of the food items in the current cart
    const orders = await Order.find({
      'items.foodItemId': { $in: foodItemIds }
    }).lean();

    // Track scores of missing items
    const missingItemsScores = {};

    // Process each order
    orders.forEach(order => {
      const orderItemIds = order.items.map(item => item.foodItemId.toString());
      const score = getMatchingScore(orderItemIds, foodItemIds);

      // Identify missing items and update their scores
      orderItemIds.forEach(itemId => {
        if (!foodItemIds.includes(itemId)) {
          if (!missingItemsScores[itemId]) {
            missingItemsScores[itemId] = 0;
          }
          missingItemsScores[itemId] += score;
        }
      });
    });

    // Sort missing items based on their scores in descending order
    const sortedMissingItemIds = Object.keys(missingItemsScores).sort((a, b) => missingItemsScores[b] - missingItemsScores[a]);

    // Get details of the sorted missing food items
    const foodItems = await getFoodItemDetails(sortedMissingItemIds);

    // Format the response
    const response = foodItems.map(foodItem => ({
      foodItemId: foodItem._id, // Include the foodItemId in the response
      mainImage: foodItem.mainImage,
      name: foodItem.name,
      cost: foodItem.discountedCost || foodItem.actualCost
    }));

    res.status(200).json({ message: 'Similar food items retrieved successfully', data: response });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

module.exports = {
  createFoodItem,
  getAllFoodItems,
  getFoodItemById,
  updateFoodItem,
  deleteFoodItem,
  giveRatingToFoodItem,
  FoodItemController,
  getFoodItemDetails,
  getSimilarFoodItems
};
