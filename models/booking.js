// models/booking.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const bookingSchema = new Schema({
  numberOfPeople: { type: Number, required: true },
  restaurantId: { type: Schema.Types.ObjectId, required: true, ref: 'Restaurant' },
  userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  status: { type: String, required: true },
  time: { type: Number, required: true },
  offerIds: [{ type: Schema.Types.ObjectId, ref: 'Offer' }]
});

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
