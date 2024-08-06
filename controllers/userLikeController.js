const UserLike = require('../models/userLike');

// Create a new like
const createUserLike = async (req, res) => {
  try {
    const { userId, type, videoId, restaurantId, foodItemId } = req.body;

    // Check if the required ID for the like type is provided
    if ((type === 'video' && !videoId) || 
        (type === 'restaurant' && !restaurantId) || 
        (type === 'foodItem' && !foodItemId)) {
      return res.status(400).json({ message: 'Required ID for the like type is missing', data: null });
    }

    const newUserLike = new UserLike(req.body);
    const savedUserLike = await newUserLike.save();
    res.status(201).json({ message: 'User like created successfully', data: savedUserLike });
  } catch (error) {
    res.status(400).json({ message: error.message, data: null });
  }
};

// Read (Get) all likes
const getAllUserLikes = async (req, res) => {
  try {
    const userLikes = await UserLike.find();
    res.status(200).json({ message: 'User likes retrieved successfully', data: userLikes });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

// Read (Get) a like by ID
const getUserLikeById = async (req, res) => {
  try {
    const { userId, id } = req.params;  // Extract userId and id from request parameters

    // Search for a like by userId and the given id in all possible fields
    const userLike = await UserLike.findOne({
      userId,
      $or: [
        { videoId: id },
        { restaurantId: id },
        { foodItemId: id }
      ]
    });

    if (!userLike) {
      return res.status(404).json({ message: 'User has not liked this item', data: null });
    }

    res.status(200).json({ message: 'User like found', data: userLike });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

// Update a like by ID
const updateUserLike = async (req, res) => {
  try {
    const updatedUserLike = await UserLike.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedUserLike) return res.status(404).json({ message: 'User like not found', data: null });
    res.status(200).json({ message: 'User like updated successfully', data: updatedUserLike });
  } catch (error) {
    res.status(400).json({ message: error.message, data: null });
  }
};

// Delete a like (replace with unliking logic)
const deleteUserLike = async (req, res) => {
  try {
    const { userId, type, itemId,videoId, restaurantId, foodItemId } = req.body;

    // Check if the required ID for the like type is provided
    if ((type === 'video' && !videoId) || 
        (type === 'restaurant' && !restaurantId) || 
        (type === 'foodItem' && !foodItemId)) {
      return res.status(400).json({ message: 'Required ID for the like type is missing', data: null });
    }

    // Construct the query based on the likeType
    let query = { userId };

    switch (type) {
      case 'video':
        query.videoId = videoId;
        break;
      case 'restaurant':
        query.restaurantId = restaurantId;
        break;
      case 'foodItem':
        query.foodItemId = foodItemId;
        break;
      default:
        return res.status(400).json({ message: 'Invalid type', data: null });
    }

    // Find and delete the like
    const deletedUserLike = await UserLike.findOneAndDelete(query);

    if (!deletedUserLike) {
      return res.status(404).json({ message: 'Like not found', data: null });
    }

    res.status(200).json({ message: 'Item unliked successfully', data: deletedUserLike });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

// Get liked videos by user
const getUserLikedVideos = async (req, res) => {
  try {
    const { userId } = req.params;
    const likes = await UserLike.find({ userId, type: 'video' });
    const likedVideos = likes.map(like => like.videoId.toString());
    res.status(200).json({ message: 'User liked videos retrieved successfully', data: likedVideos });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

// Get liked restaurants by user
const getUserLikedRestaurants = async (req, res) => {
  try {
    const { userId } = req.params;
    const likes = await UserLike.find({ userId, type: 'restaurant' });
    const likedRestaurants = likes.map(like => like.restaurantId.toString());
    res.status(200).json({ message: 'User liked restaurants retrieved successfully', data: likedRestaurants });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

// Get liked food items by user
const getUserLikedFoodItems = async (req, res) => {
  try {
    const { userId } = req.params;
    const likes = await UserLike.find({ userId, type: 'foodItem' });
    const likedFoodItems = likes.map(like => like.foodItemId.toString());
    res.status(200).json({ message: 'User liked food items retrieved successfully', data: likedFoodItems });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

module.exports = {
  createUserLike,
  getAllUserLikes,
  getUserLikeById,
  updateUserLike,
  deleteUserLike,
  getUserLikedVideos,
  getUserLikedRestaurants,
  getUserLikedFoodItems
};