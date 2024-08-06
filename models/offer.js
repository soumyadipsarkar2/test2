// models/offer.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const offerSchema = new Schema({
  type: { type: String },
  imageLink:{ type: String },
  description: { type: String, required: true },
  restaurantId: { type: Schema.Types.ObjectId, required: true, ref: 'Restaurant' },
  endDate: Number,
  startDate: Number,
  conditions: { type: [String], required: true },
  foodItemId: { type: Schema.Types.ObjectId, ref: 'FoodItem' },
  status: { type: String, required: true },
  amount: Number
});

const Offer = mongoose.model('Offer', offerSchema);

module.exports = Offer;
