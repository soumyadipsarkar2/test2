const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const addressSchema = new Schema({
  street: String,
  city: String,
  state: String,
  postalCode: String,
  country: String
});

const userSchema = new Schema({
  addresses: [addressSchema],
  googleId: String,
  name: String,
  email: String,
  phoneNumber: String,
  gender: String,
  password: String,
  dateOfBirth: Date,
  image: String,
  likes: {
    videos: [{ type: Schema.Types.ObjectId, ref: 'Video' }],
    restaurants: [{ type: Schema.Types.ObjectId, ref: 'Restaurant' }],
    foodItems: [{ type: Schema.Types.ObjectId, ref: 'FoodItem' }]
  }
});

const User = mongoose.model('User', userSchema);

module.exports = User;