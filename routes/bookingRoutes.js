// routes/bookingRoutes.js
const express = require('express');
const {
  createBooking,
  getAllBookings,
  getBookingById,
  updateBooking,
  deleteBooking,
  getPastBookingsByUserId,
  getCurrentBookingsByUserId
} = require('../controllers/bookingController');

const router = express.Router();

router.post('/bookings', createBooking);
router.get('/bookings', getAllBookings);
router.get('/bookings/:id', getBookingById);
router.put('/bookings/:id', updateBooking);
router.delete('/bookings/:id', deleteBooking);
router.get('/pastBookings', getPastBookingsByUserId);
router.get('/currentBookings', getCurrentBookingsByUserId);

module.exports = router;
