// routes/commentRoutes.js
const express = require('express');
const {
  createComment,
  getAllComments,
  getCommentById,
  updateComment,
  deleteComment,
  getCommentsByRestaurantId,
  getCommentsByFoodItemId,
  getCommentsByVideoId,
  addReplytoComment,
  updateReplytoComment,
  removeReplytoComment,
  setLikestoCommentReply,
  addLikesToReply
} = require('../controllers/commentController');

const router = express.Router();

router.post('/comments', createComment);
router.get('/comments', getAllComments);
router.get('/comments/video', getCommentsByVideoId);
router.get('/comments/:id', getCommentById);
router.put('/comments/:id', updateComment);
router.delete('/comments/:id', deleteComment);
router.get('/comments/restaurant', getCommentsByRestaurantId);
router.get('/comments/foodItem', getCommentsByFoodItemId);
router.post('/comments/:commentId/reply', addReplytoComment);
router.put('/comments/:commentId/replies/:replyId', updateReplytoComment);
router.delete('/comments/:commentId/replies/:replyId', removeReplytoComment);

module.exports = router;
