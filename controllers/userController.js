// controllers/userController.js
const User = require('../models/user');
const jwt = require('jsonwebtoken');

class UserController {
  static async getUserById(userId, fields) {
    try {
      const user = await User.findById(userId);
      if (!user) return null;
      
      const result = {};
      fields.forEach(field => {
        result[field] = user[field];
      });
      return result;
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      throw error;
    }
  }
}

// Create a new user
const createUser = async (req, res) => {
  try {
    const newUser = new User(req.body);
    const savedUser = await newUser.save();
    res.status(201).json({ message: 'User created successfully', data: savedUser });
  } catch (error) {
    res.status(400).json({ message: error.message, data: null });
  }
};

// Read (Get) all users
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json({ message: 'Users retrieved successfully', data: users });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

// Read (Get) a user by ID
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found', data: null });
    res.status(200).json({ message: 'User retrieved successfully', data: user });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

// Update a user by ID
const updateUser = async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedUser) return res.status(404).json({ message: 'User not found', data: null });
    res.status(200).json({ message: 'User updated successfully', data: updatedUser });
  } catch (error) {
    res.status(400).json({ message: error.message, data: null });
  }
};

// Delete a user by ID
const deleteUser = async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) return res.status(404).json({ message: 'User not found', data: null });
    res.status(200).json({ message: 'User deleted successfully', data: deletedUser });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

// Get User by ID with specified fields
const getUserByIdForFields = async (userId, fields) => {
  try {
    const user = await User.findById(userId).select(fields.join(' '));
    if (!user) return null;
    
    const result = {};
    fields.forEach(field => {
      result[field] = user[field];
    });
    return result;
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    throw error;
  }
};

// Add a like
const addUserLike = async (req, res) => {
  try {
    const { userId, type, videoId, restaurantId, foodItemId } = req.body;

    // Validate input
    if ((type === 'video' && !videoId) || 
        (type === 'restaurant' && !restaurantId) || 
        (type === 'foodItem' && !foodItemId)) {
      return res.status(400).json({ message: 'Required ID for the like type is missing', data: null });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found', data: null });
    }

    // Check if the like already exists
    let alreadyLiked = false;
    switch (type) {
      case 'video':
        alreadyLiked = user.likes.videos.includes(videoId);
        if (!alreadyLiked) user.likes.videos.push(videoId);
        break;
      case 'restaurant':
        alreadyLiked = user.likes.restaurants.includes(restaurantId);
        if (!alreadyLiked) user.likes.restaurants.push(restaurantId);
        break;
      case 'foodItem':
        alreadyLiked = user.likes.foodItems.includes(foodItemId);
        if (!alreadyLiked) user.likes.foodItems.push(foodItemId);
        break;
      default:
        return res.status(400).json({ message: 'Invalid type', data: null });
    }

    if (alreadyLiked) {
      return res.status(200).json({ message: 'Already liked', data: user.likes });
    }

    await user.save();

    res.status(201).json({ message: 'Like added successfully', data: user.likes });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

// Remove a like
const removeUserLike = async (req, res) => {
  try {
    const { userId, type, videoId, restaurantId, foodItemId } = req.body;

    // Validate input
    if ((type === 'video' && !videoId) || 
        (type === 'restaurant' && !restaurantId) || 
        (type === 'foodItem' && !foodItemId)) {
      return res.status(400).json({ message: 'Required ID for the like type is missing', data: null });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found', data: null });
    }

    // Remove like
    switch (type) {
      case 'video':
        user.likes.videos = user.likes.videos.filter(id => id.toString() !== videoId);
        break;
      case 'restaurant':
        user.likes.restaurants = user.likes.restaurants.filter(id => id.toString() !== restaurantId);
        break;
      case 'foodItem':
        user.likes.foodItems = user.likes.foodItems.filter(id => id.toString() !== foodItemId);
        break;
      default:
        return res.status(400).json({ message: 'Invalid type', data: null });
    }

    await user.save();

    res.status(200).json({ message: 'Like removed successfully', data: user.likes });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

// Get User Likes
const getUserRestaurantLikes = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .populate({
        path: 'likes.restaurants',
        select: '_id name mainImage rating' // Select necessary fields for restaurants
      });

    if (!user) {
      return res.status(404).json({ message: 'User not found', data: null });
    }

    res.status(200).json({ 
      message: 'User likes retrieved successfully', 
      data: user.likes.restaurants
    });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

// Get User Likes
const getUserFoodItemLikes = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .populate({
        path: 'likes.foodItems',
        select: 'name mainImage actualCost discountedCost' // Select necessary fields for food items
      });

    if (!user) {
      return res.status(404).json({ message: 'User not found', data: null });
    }

    res.status(200).json({ 
      message: 'User likes retrieved successfully', 
      data: user.likes.foodItems
    });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

// Helper function to verify JWT token and extract user ID
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

// Read (Get) user details by token ID
const getUserByTokenId = async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1]; // Assuming 'Bearer <token>'
    if (!token) return res.status(401).json({ message: 'Token is missing', data: null });

    const decoded = verifyToken(token);
    const userId = decoded.id;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found', data: null });

    res.status(200).json({ message: 'User retrieved successfully', data: user });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  UserController,
  addUserLike,
  removeUserLike,
  getUserRestaurantLikes,
  getUserFoodItemLikes,
  getUserByTokenId
};