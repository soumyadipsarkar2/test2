// routes/userRoutes.js
const express = require('express');
const {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  addUserLike,
  removeUserLike,
  getUserRestaurantLikes,
  getUserFoodItemLikes,
  getUserByTokenId
} = require('../controllers/userController');

const router = express.Router();

router.get('/users/userByTokenId', getUserByTokenId);
router.post('/users', createUser);
router.get('/users', getAllUsers);
router.post('/users/userLikes', addUserLike);
router.delete('/users/userLikes', removeUserLike);
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.get('/users/:userId/restaurantLikes', getUserRestaurantLikes);
router.get('/users/:userId/foodItemLikes', getUserFoodItemLikes);
module.exports = router;