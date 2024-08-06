const mongoose = require('mongoose');
const { Schema } = mongoose;

const statusTimeSchema = new Schema({
  placed: { type: Number, default: null },
  success: { type: Number, default: null },
  processing: { type: Number, default: null },
  failed: { type: Number, default: null }
});

const paymentSchema = new Schema({
  amount: { type: Number, required: true },
  status: { type: String, required: true },
  mode: { type: String, required: true },
  orderId: { type: String, required: true },
  transactionId: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  statusTime: statusTimeSchema
});

const Payment = mongoose.model('Payment', paymentSchema);
module.exports = Payment;