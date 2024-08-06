// models/video.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const videoSchema = new Schema({
  name: { type: String, required: true },
  likes: { type: Number, default: 0 },
  comments: { type: Number, default: 0 },
  link: { type: String, required: true },
  foodItemId: { type: Schema.Types.ObjectId, ref: 'FoodItem' },
  ctaText: { type: String, required: true },
  restaurantId: { type: Schema.Types.ObjectId, required: true, ref: 'Restaurant' },
  type: { type: String, required: true }
});

const Video = mongoose.model('Video', videoSchema);

module.exports = Video;
