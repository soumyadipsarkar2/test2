// routes/bookingRoutes.js
const express = require('express');
const {
  createBooking,
  getAllBookings,
  getBookingById,
  updateBooking,
  deleteBooking,
  getPastBookingsByUserId,
  getCurrentBookingsByUserId,
  getTodayBookings
} = require('../controllers/bookingController');

const router = express.Router();

router.post('/bookings', createBooking);
router.get('/bookings', getAllBookings);
router.get('/bookings/todayBookings', getTodayBookings); // Add the new route
router.get('/bookings/:id', getBookingById);
router.put('/bookings/:id', updateBooking);
router.delete('/bookings/:id', deleteBooking);
router.get('/bookings/pastBookings', getPastBookingsByUserId);
router.get('/bookings/currentBookings', getCurrentBookingsByUserId);

module.exports = router;
