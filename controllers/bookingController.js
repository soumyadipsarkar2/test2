// controllers/bookingController.js
const Booking = require('../models/booking');
const User = require('../models/user');
const { getRestaurantDetails } = require('./restaurantController');

// Create a new booking
const createBooking = async (req, res) => {
  try {
    const bookingData = {
      ...req.body,
      status: 'Booked' // Set the status to 'Booked'
    };

    const newBooking = new Booking(bookingData);
    const savedBooking = await newBooking.save();
    
    res.status(201).json({ message: 'Booking created successfully', data: savedBooking });
  } catch (error) {
    res.status(400).json({ message: error.message, data: null });
  }
};

// Read (Get) all bookings
const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find();
    res.status(200).json({ message: 'Bookings retrieved successfully', data: bookings });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

// Read (Get) a booking by ID
const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found', data: null });
    res.status(200).json({ message: 'Booking retrieved successfully', data: booking });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

const getPastBookingsByUserId = async (req, res) => {
  const userId = req.query.userId;
  try {
    sort = {'time': -1};
    const bookings = await Booking.find({ userId,status:"completed"}).sort(sort);
    res.status(200).json({ message: 'Booking retrieved successfully', data: bookings });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
}

const getCurrentBookingsByUserId = async (req, res) => {
  const userId = req.query.userId;
  try {
    // Step 1: Fetch current bookings for the user
    const sort = { 'time': -1 };
    const bookings = await Booking.find({ userId }).sort(sort);

    if (bookings.length === 0) {
      return res.status(404).json({ message: 'No current bookings found for the user', data: null });
    }

    // Step 2: Extract restaurant IDs from bookings
    const restaurantIds = bookings.map(booking => booking.restaurantId);
    
    // Step 3: Fetch restaurant details
    const restaurantDetails = await getRestaurantDetails(restaurantIds);
    const restaurantMap = restaurantDetails.reduce((acc, restaurant) => {
      acc[restaurant._id.toString()] = {
        name: restaurant.name,
        address: restaurant.address
      };
      return acc;
    }, {});

    // Step 4: Fetch user details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found', data: null });
    }

    const userInfo = {
      name: user.name,
      phoneNumber: user.phoneNumber
    };

    // Step 5: Combine bookings, restaurant details, and user details
    const detailedBookings = bookings.map(booking => ({
      ...booking.toObject(), // Convert mongoose document to plain object
      restaurant: restaurantMap[booking.restaurantId.toString()],
      user: userInfo
    }));

    res.status(200).json({
      message: 'Current bookings retrieved successfully',
      data: detailedBookings
    });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

// Update a booking by ID
const updateBooking = async (req, res) => {
  try {
    const updatedBooking = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedBooking) return res.status(404).json({ message: 'Booking not found', data: null });
    res.status(200).json({ message: 'Booking updated successfully', data: updatedBooking });
  } catch (error) {
    res.status(400).json({ message: error.message, data: null });
  }
};

const deleteBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    
    // Find the booking by ID
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found', data: null });

    // Update the booking status to 'Cancelled'
    booking.status = 'Cancelled';
    const updatedBooking = await booking.save();

    res.status(200).json({ message: 'Booking cancelled successfully', data: updatedBooking });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

const getTodayBookings = async (req, res) => {
  const { userId } = req.query;

  try {
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required', data: null });
    }

    const startOfDay = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
    const endOfDay = Math.floor(new Date().setHours(23, 59, 59, 999) / 1000);

    const bookings = await Booking.find({
      userId,
      time: { $gte: startOfDay, $lt: endOfDay },
      status: 'Booked'
    });

    if (bookings.length === 0) {
      return res.status(404).json({ message: 'No bookings found for today', data: null });
    }

    res.status(200).json({ message: 'Bookings for today retrieved successfully', data: bookings });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

async function getDiningBookings(userId) {
  return await Booking.find({ userId, status: 'confirmed' }).populate('restaurantId').exec();
}

module.exports = {
  createBooking,
  getAllBookings,
  getBookingById,
  updateBooking,
  deleteBooking,
  getPastBookingsByUserId,
  getCurrentBookingsByUserId,
  getDiningBookings,
  getTodayBookings
};
