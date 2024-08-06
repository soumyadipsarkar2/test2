// routes/paymentRoutes.js
const express = require('express');
const {
  createPayment,
  getAllPayments,
  getPaymentById,
  updatePayment,
  deletePayment,
  confirmPayment,
  getPaymentStatus
} = require('../controllers/paymentController');

const router = express.Router();

router.post('/payments', createPayment);
router.get('/payments', getAllPayments);
router.get('/payments/:id', getPaymentById);
router.put('/payments/:id', updatePayment);
router.delete('/payments/:id', deletePayment);
router.get('/payments/:orderId', getPaymentStatus);
router.post('/payments/confirmPayment', confirmPayment);
module.exports = router;
