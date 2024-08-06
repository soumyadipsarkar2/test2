const mongoose = require('mongoose');
const { Schema } = mongoose;

const operatingTimeSchema = new Schema({
  day: { type: String, required: true },
  openingTime: { type: String, required: true },
  closingTime: { type: String, required: true }
});

const restaurantSchema = new Schema({
  address: {
    streetAddress: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: Number, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
  },
  rating: { type: Number, default: 0 },
  foodType: [String],
  cuisines: [String],
  modeSupported: [String],
  popularDishes: [String],
  avgCosts: {
    2: { type: Number },
    4: { type: Number }
  },
  diningCategories: [String],
  additionalDetails: [String],
  menuImageLink: String,
  operatingTime: {
    type: [operatingTimeSchema],
    default: () => [
      { day: 'Monday', openingTime: '10:00 AM', closingTime: '11:00 PM' },
      { day: 'Tuesday', openingTime: '10:00 AM', closingTime: '11:00 PM' },
      { day: 'Wednesday', openingTime: '10:00 AM', closingTime: '11:00 PM' },
      { day: 'Thursday', openingTime: '10:00 AM', closingTime: '11:00 PM' },
      { day: 'Friday', openingTime: '10:00 AM', closingTime: '11:00 PM' },
      { day: 'Saturday', openingTime: '10:00 AM', closingTime: '11:00 PM' },
      { day: 'Sunday', openingTime: '10:00 AM', closingTime: '11:00 PM' }
    ]
  },
  reviews: { type: Number, default: 0 },
  numberOfRatings: { type: Number, default: 0 },
  diningTerms: String,
  name: { type: String, required: true },
  images: [String],
  mainImage: String,
  location: {
    type: { type: String, default: 'Point' },
    coordinates: [Number]
  },
  brandId: { type: mongoose.Schema.Types.ObjectId, required: true }
});

const Restaurant = mongoose.model('Restaurant', restaurantSchema);

module.exports = Restaurant;