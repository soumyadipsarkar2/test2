const mongoose = require('mongoose');
const { Schema } = mongoose;

const nutritionSchema = new Schema({
  calories: String,
  carbs: String,
  fats: String
});

const addOnSchema = new Schema({
  name: String,
  groupName: String,
  price: Number
});

const foodItemSchema = new Schema({
  name: { type: String, required: true },
  restaurantId: { type: Schema.Types.ObjectId, required: true, ref: 'Restaurant' },
  type: { type: String, required: true },
  rating: { type: Number, default: 0 },
  actualCost: { type: Number, required: true },
  discountedCost: Number,
  nutritionDetails: nutritionSchema,
  details: { type: String, required: true },
  status: { type: String, required: true },
  numberOfRatings: { type: Number, default: 0 },
  reviews: { type: Number, default: 0 },
  images: [String],
  mainImage: String,
  cuisines: [String],
  addOns: [addOnSchema],
  category: { type: String, required: true },
  bestseller: { type: Boolean, default: false },
  dietary: [String]
});

const FoodItem = mongoose.model('FoodItem', foodItemSchema);

module.exports = FoodItem;