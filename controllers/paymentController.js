// controllers/paymentController.js
const Payment = require('../models/payment');
const Order = require('../models/order');
const CachedData = require('../models/cachedData');
const { createOrder2 } = require('./orderController');

// Create a new payment
const createPayment = async (req, res) => {
  try {
    const newPayment = new Payment(req.body);
    const savedPayment = await newPayment.save();
    res.status(201).json({ message: 'Payment created successfully', data: savedPayment });
  } catch (error) {
    res.status(400).json({ message: error.message, data: null });
  }
};

// Read (Get) all payments
const getAllPayments = async (req, res) => {
  try {
    const payments = await Payment.find();
    res.status(200).json({ message: 'Payments retrieved successfully', data: payments });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

// Read (Get) a payment by ID
const getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found', data: null });
    res.status(200).json({ message: 'Payment retrieved successfully', data: payment });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

// Update a payment by ID
const updatePayment = async (req, res) => {
  try {
    const updatedPayment = await Payment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedPayment) return res.status(404).json({ message: 'Payment not found', data: null });
    res.status(200).json({ message: 'Payment updated successfully', data: updatedPayment });
  } catch (error) {
    res.status(400).json({ message: error.message, data: null });
  }
};

// Delete a payment by ID
const deletePayment = async (req, res) => {
  try {
    const deletedPayment = await Payment.findByIdAndDelete(req.params.id);
    if (!deletedPayment) return res.status(404).json({ message: 'Payment not found', data: null });
    res.status(200).json({ message: 'Payment deleted successfully', data: deletedPayment });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

const confirmPayment = async (req, res) => {
  const { orderId, status, transactionId, amount, mode } = req.body;
  const timestamp = Math.floor(Date.now() / 1000);

  if (!orderId || !status || !transactionId || !amount || !mode) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    // Fetch cached order data
    const cacheKey = `orderData#${orderId}`;
    let cachedOrderData = await CachedData.findOne({ key: cacheKey });
    if(cachedOrderData){cachedOrderData=cachedOrderData.value;}

    if (!cachedOrderData) {
      return res.status(404).json({ message: 'Order data not found in cache', data: null });
    }

    const orderDetails = JSON.parse(cachedOrderData);

    // Create the payment record
    const payment = new Payment({
      amount,
      status,
      mode,
      orderId,
      transactionId,
      userId: orderDetails.userId,
      statusTime: {
        placed: orderDetails.placedOn,
        success: status === 'success' ? timestamp : null,
        failed: status === 'failed' ? timestamp : null,
        processing: status === 'processing' ? timestamp : null
      }
    });

    await payment.save();

    // Create the order and get the new orderId
    const paymentDetails = { paymentStatus: status, status, paymentId: payment._id, timestamp };
    const newOrder = await createOrder2(orderDetails, paymentDetails, orderId);

    // Clear the cache if payment is successful
    if (status === 'success') {
      const cartKey = `cart#${orderDetails.userId}`;
      await CachedData.deleteOne({ key: cartKey });
      const chargesCacheKey = `charges#${orderDetails.userId}#${orderDetails.restaurantId}`;
      await CachedData.deleteOne({ key: chargesCacheKey });
      await CachedData.deleteOne({ key: cacheKey });
    }

    // Respond with new orderId and success message
    res.status(200).json({ message: 'Payment successful', orderId: newOrder._id });
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(400).json({ message: error.message, data: null });
  }
};

// Get Payment Status by Order ID
const getPaymentStatus = async (req, res) => {
  const { orderId } = req.params;

  if (!orderId) {
    return res.status(400).json({ message: 'Order ID is required' });
  }

  try {
    // Find the order to get associated paymentId
    const order = await Order.findById(orderId).select('paymentId');
    if (!order) {
      return res.status(404).json({ message: 'Order not found', data: null });
    }

    // Find the payment record using the paymentId from the order
    const payment = await Payment.findById(order.paymentId);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found', data: null });
    }

    // Respond with payment details
    res.status(200).json({ message: 'Payment status retrieved successfully', data: payment });
  } catch (error) {
    console.error('Error retrieving payment status:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

module.exports = {
  createPayment,
  getAllPayments,
  getPaymentById,
  updatePayment,
  deletePayment,
  confirmPayment,
  getPaymentStatus
};
