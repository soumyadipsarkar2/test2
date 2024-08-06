// controllers/notificationController.js
const Notification = require('../models/notification');

// Create a new notification
const createNotification = async (req, res) => {
  try {
    const newNotification = new Notification(req.body);
    const savedNotification = await newNotification.save();
    res.status(201).json({ message: 'Notification created successfully', data: savedNotification });
  } catch (error) {
    res.status(400).json({ message: error.message, data: null });
  }
};

// Read (Get) all notifications
const getAllNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find();
    res.status(200).json({ message: 'Notifications retrieved successfully', data: notifications });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

// Read (Get) a notification by ID
const getNotificationById = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) return res.status(404).json({ message: 'Notification not found', data: null });
    res.status(200).json({ message: 'Notification retrieved successfully', data: notification });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

// Update a notification by ID
const updateNotification = async (req, res) => {
  try {
    const updatedNotification = await Notification.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedNotification) return res.status(404).json({ message: 'Notification not found', data: null });
    res.status(200).json({ message: 'Notification updated successfully', data: updatedNotification });
  } catch (error) {
    res.status(400).json({ message: error.message, data: null });
  }
};

// Delete a notification by ID
const deleteNotification = async (req, res) => {
  try {
    const deletedNotification = await Notification.findByIdAndDelete(req.params.id);
    if (!deletedNotification) return res.status(404).json({ message: 'Notification not found', data: null });
    res.status(200).json({ message: 'Notification deleted successfully', data: deletedNotification });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

module.exports = {
  createNotification,
  getAllNotifications,
  getNotificationById,
  updateNotification,
  deleteNotification
};
