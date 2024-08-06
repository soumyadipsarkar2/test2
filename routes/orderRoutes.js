// routes/orderRoutes.js
const express = require('express');
const {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
  getPastOrdersByUserId,
  getOrdersByUserId,
  updateOrderStatus,
  calculateCharges,
  cancelOrder,
  addToCart,
  getCartItems
} = require('../controllers/orderController');

const router = express.Router();

router.post('/orders', createOrder);
router.get('/orders', getAllOrders);
router.get('/orders/currentOrders', getOrdersByUserId);
router.get('/orders/getCartItems', getCartItems);
router.post('/orders/addToCart', addToCart);
router.get('/orders/calculateCharges', calculateCharges);
router.put('/orders/cancelOrder/:orderId', cancelOrder);
router.get('/orders/:id', getOrderById);
router.put('/orders/:id', updateOrder);
router.delete('/orders/:id', deleteOrder);
router.get('/pastOrders', getPastOrdersByUserId);
router.put('/updateOrderStatus/:orderId', updateOrderStatus);

module.exports = router;
