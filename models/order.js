const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const addOnSchema = new Schema({
  name: String,
  groupName: String,
  price: Number
});

const itemSchema = new Schema({
  foodItemId: { type: Schema.Types.ObjectId, required: true, ref: 'FoodItem' },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  addOns: [addOnSchema]
});

const addressSchema = new Schema({
  streetAddress: { type: String, required: true },
  zipCode: { type: Number, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true }
});

const statusTimeSchema = new Schema({
  placed: { type: Number, default: null },
  success: { type: Number, default: null },
  processing: { type: Number, default: null },
  cancelled: { type: Number, default: null },
  failed: { type: Number, default: null },
  shipped: { type: Number, default: null },
  dispatched: { type: Number, default: null },
  delivered: { type: Number, default: null }
});

const orderSchema = new Schema({
  items: [itemSchema],
  status: { type: String, required: true },
  restaurantId: { type: Schema.Types.ObjectId, required: true, ref: 'Restaurant' },
  userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  deliveryPartnerTipped: { type: Number, required: true },
  deliveryPartnerId: { type: String, required: true },
  paymentStatus: { type: String, required: true },
  deliveryFees: { type: Number, required: true },
  gstCharges: Number,
  total: { type: Number, required: true },
  totalDiscounted: { type: Number, required: true },
  totalSavings: { type: Number, required: true },
  completionTime: Number,
  placedOn: { type: Number, required: true },
  address: addressSchema,
  terms: { type: String, required: true },
  extraCharges: Number,
  offerIds: [{ type: Schema.Types.ObjectId, ref: 'Offer' }],
  statusTime: statusTimeSchema,
  deliveryInstructions: [String],
  paymentId: { type: Schema.Types.ObjectId, ref: 'Payment' },
  cachedOrderId: { type: String, required: true }  // New field for cached Order ID
});

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;