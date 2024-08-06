// routes/videoRoutes.js
const express = require('express');
const {
  createVideo,
  getAllVideos,
  getVideoById,
  updateVideo,
  deleteVideo,
  getVideosByRestaurantId
} = require('../controllers/videoController');

const router = express.Router();

router.post('/videos', createVideo);
router.get('/videos', getAllVideos);
router.get('/videos/:id', getVideoById);
router.put('/videos/:id', updateVideo);
router.delete('/videos/:id', deleteVideo);
router.get('/videos/restaurant/:restaurantId', getVideosByRestaurantId);

module.exports = router;
