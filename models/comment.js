// models/comment.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const replySchema = new Schema({
  restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant' },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  message: { type: String, required: true },
  date: { type: Number, required: true },
  likes: { type: Number, default: 0 },
  userName: { type: String },
  userImage: { type: String },
  restaurantName: { type: String },
  restaurantImage: { type: String },
});

const commentSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant' },
  message: { type: String, required: true },
  likes: { type: Number, default: 0 },
  replies: [replySchema],
  date: { type: Number, required: true },
  videoId: { type: Schema.Types.ObjectId, ref: 'Video' },
  type: { type: String, enum: ['restaurant', 'foodItem', 'restaurantVideo', 'foodItemVideo'], required: true },
  foodItemId: { type: Schema.Types.ObjectId, ref: 'FoodItem' },
  userName: { type: String },
  userImage: { type: String },
  restaurantName: { type: String },
  restaurantImage: { type: String },
});

const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;