// controllers/commentController.js
const Comment = require('../models/comment');
const { VideoController } = require('./videoController');
const { RestaurantController } = require('./restaurantController');
const { FoodItemController } = require('./foodItemController');
const { UserController } = require('./userController');

const createComment = async (req, res) => {
  try {
    const { type, videoId, restaurantId, foodItemId, userId } = req.body;

    if (!type) return res.status(404).json({ message: 'Comment type not specified', data: null });

    let userFields = [];
    let restaurantFields = [];

    if (userId) {
      userFields = ['name', 'image'];
    }
    if (restaurantId) {
      restaurantFields = ['name', 'mainImage'];
    }

    let userName = '';
    let userImage = '';
    let restaurantName = '';
    let restaurantImage = '';

    if (userId && userFields.length > 0) {
      const user = await UserController.getUserById(userId, userFields);
      if (user) {
        userName = user.name || '';
        userImage = user.image || '';
      }
    }

    if (restaurantId && restaurantFields.length > 0) {
      const restaurant = await RestaurantController.getRestaurantById(restaurantId, restaurantFields);
      if (restaurant) {
        restaurantName = restaurant.name || '';
        restaurantImage = restaurant.mainImage || '';
      }
    }

    if (type === 'foodItemVideo' || type === 'restaurantVideo') {
      await VideoController.incrementCommentCount(videoId);
    }
    if (type === 'restaurant') {
      await RestaurantController.incrementReviewCount(restaurantId);
    }
    if (type === 'foodItem') {
      await FoodItemController.incrementReviewCount(foodItemId);
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const newComment = new Comment({
      ...req.body,
      date: timestamp,
      ...(userId && { userName, userImage }),
      ...(restaurantId && { restaurantName, restaurantImage })
    });
    const savedComment = await newComment.save();
    
    res.status(201).json({ message: 'Comment created successfully', data: savedComment });
  } catch (error) {
    res.status(400).json({ message: error.message, data: null });
  }
};

// Get All Comments
const getAllComments = async (req, res) => {
  try {
    const comments = await Comment.find();
    res.status(200).json({ message: 'Comments retrieved successfully', data: comments });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

// Get Comment by ID
const getCommentById = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: 'Comment not found', data: null });
    res.status(200).json({ message: 'Comment retrieved successfully', data: comment });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

// Update a Comment
const updateComment = async (req, res) => {
  try {
    const updatedComment = await Comment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedComment) return res.status(404).json({ message: 'Comment not found', data: null });
    res.status(200).json({ message: 'Comment updated successfully', data: updatedComment });
  } catch (error) {
    res.status(400).json({ message: error.message, data: null });
  }
};

// Delete a Comment
const deleteComment = async (req, res) => {
  try {
    const deletedComment = await Comment.findByIdAndDelete(req.params.id);
    if (!deletedComment) return res.status(404).json({ message: 'Comment not found', data: null });
    res.status(200).json({ message: 'Comment deleted successfully', data: deletedComment });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

// Get Comments by Restaurant ID
const getCommentsByRestaurantId = async (req, res) => {
  const restaurantId = req.query.restaurantId;
  try {
    const comments = await Comment.find({ restaurantId, type: 'restaurant' }).lean();
    res.status(200).json({ message: 'Comments retrieved successfully', data: comments });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

// Get Comments by Food Item ID
const getCommentsByFoodItemId = async (req, res) => {
  const foodItemId = req.query.foodItemId;
  try {
    const comments = await Comment.find({ foodItemId, type: 'foodItem' }).lean();
    res.status(200).json({ message: 'Comments retrieved successfully', data: comments });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

// Get Comments by Video ID
const getCommentsByVideoId = async (req, res) => {
  const videoId = req.query.videoId;
  if (!videoId) {
    return res.status(400).json({ message: 'videoId is required', data: null });
  }

  try {
    const comments = await Comment.find({ videoId }).lean();
    if (!comments || comments.length === 0) {
      return res.status(404).json({ message: 'No comments found for the given videoId', data: null });
    }
    res.status(200).json({ message: 'Comments retrieved successfully', data: comments });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

// Add Reply to Comment
const addReplytoComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { userId, restaurantId, message } = req.body;
    let userName, userImage, restaurantName, restaurantImage;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (userId) {
      const user = await UserController.getUserById(userId, ['name', 'image']);
      userName = user.name;
      userImage = user.image;
    } else if (restaurantId) {
      const restaurant = await RestaurantController.getRestaurantById(restaurantId, ['name', 'mainImage']);
      restaurantName = restaurant.name;
      restaurantImage = restaurant.mainImage;
    }

    const reply = {
      userId,
      restaurantId,
      message,
      date: Date.now(),
      userName,
      userImage,
      restaurantName,
      restaurantImage
    };

    const updatedComment = await Comment.findByIdAndUpdate(
      commentId,
      { $push: { replies: reply } },
      { new: true, useFindAndModify: false }
    );

    if (!updatedComment) {
      return res.status(404).json({ message: 'Comment not found', data: null });
    }

    res.status(200).json({ message: 'Reply added to comment successfully', data: updatedComment });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

// Add Likes to a Reply
const addLikesToReply = async (req, res) => {
  try {
    const { commentId, replyId } = req.params;
    const { likes } = req.body;

    if (typeof likes !== 'number') {
      return res.status(400).json({ error: 'Likes must be a number' });
    }

    const updatedComment = await Comment.findOneAndUpdate(
      { _id: commentId, 'replies._id': replyId },
      { $set: { 'replies.$.likes': likes } },
      { new: true, useFindAndModify: false }
    );

    if (!updatedComment) {
      return res.status(404).json({ message: 'Comment or reply not found', data: null });
    }

    res.status(200).json({ message: 'Likes added to reply successfully', data: updatedComment });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

// Update Reply to a Comment
const updateReplytoComment = async (req, res) => {
  try {
    const { commentId, replyId } = req.params;
    const updateFields = req.body;

    // Ensure that at least one field is provided
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ message: 'At least one field is required to update', data: null });
    }

    // Find the comment and reply to be updated
    const comment = await Comment.findOne({ _id: commentId, 'replies._id': replyId });

    if (!comment) {
      return res.status(404).json({ message: 'Comment or reply not found', data: null });
    }

    // Find the reply index in the replies array
    const replyIndex = comment.replies.findIndex(reply => reply._id.toString() === replyId);

    if (replyIndex === -1) {
      return res.status(404).json({ message: 'Reply not found', data: null });
    }

    // Update the specific fields in the reply
    const updatedReply = {
      ...comment.replies[replyIndex].toObject(),
      ...updateFields,
      date: Date.now() // Update the date to the current timestamp
    };

    // Perform the update
    comment.replies[replyIndex] = updatedReply;
    await comment.save();

    res.status(200).json({ message: 'Reply updated successfully', data: comment });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

// Remove Reply from a Comment
const removeReplytoComment = async (req, res) => {
  try {
    const { commentId, replyId } = req.params;

    const updatedComment = await Comment.findByIdAndUpdate(
      commentId,
      { $pull: { replies: { _id: replyId } } },
      { new: true, useFindAndModify: false }
    );

    if (!updatedComment) {
      return res.status(404).json({ message: 'Comment not found', data: null });
    }

    res.status(200).json({ message: 'Reply removed successfully', data: updatedComment });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

module.exports = {
  createComment,
  getAllComments,
  getCommentById,
  updateComment,
  deleteComment,
  getCommentsByRestaurantId,
  getCommentsByFoodItemId,
  getCommentsByVideoId,
  addReplytoComment,
  addLikesToReply,
  updateReplytoComment,
  removeReplytoComment
};