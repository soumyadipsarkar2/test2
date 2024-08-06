// routes/notificationRoutes.js
const express = require('express');
const {
  createNotification,
  getAllNotifications,
  getNotificationById,
  updateNotification,
  deleteNotification
} = require('../controllers/notificationController');

const router = express.Router();

router.post('/notifications', createNotification);
router.get('/notifications', getAllNotifications);
router.get('/notifications/:id', getNotificationById);
router.put('/notifications/:id', updateNotification);
router.delete('/notifications/:id', deleteNotification);

module.exports = router;
