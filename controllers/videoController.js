// controllers/videoController.js
const Video = require('../models/video');

class VideoController {
  static async incrementCommentCount(videoId) {
    try {
      // Find the video by ID and update the comments count
      const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        { $inc: { comments: 1 } },
        { new: true, useFindAndModify: false }
      );

      if (!updatedVideo) {
        throw new Error('Video not found');
      }

      return updatedVideo;
    } catch (error) {
      console.error('Error incrementing comment count:', error);
      throw error;
    }
  }

  static async incrementLikeCount(videoId) {
    try {
      // Find the video by ID and update the comments count
      const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        { $inc: { likes: 1 } },
        { new: true, useFindAndModify: false }
      );

      if (!updatedVideo) {
        throw new Error('Video not found');
      }

      return updatedVideo;
    } catch (error) {
      console.error('Error incrementing like count:', error);
      throw error;
    }
  }
}

// Create a new video
const createVideo = async (req, res) => {
  try {
    const { type } = req.body;
    if (!type) return res.status(404).json({ message: 'Video type not there', data: null });
    let ctaText;
    if(type=="dining")ctaText="Book Now";
    if(type=="delivery")ctaText="Order Now";
    const newVideo = new Video({...req.body,ctaText});
    const savedVideo = await newVideo.save();
    res.status(201).json({ message: 'Video created successfully', data: savedVideo });
  } catch (error) {
    res.status(400).json({ message: error.message, data: null });
  }
};

const getAllVideos = async (req, res) => {
  try {
    const { restaurantId } = req.query;

    // If restaurantId is provided, filter videos by restaurantId
    const query = restaurantId ? { restaurantId } : {};

    const videos = await Video.find(query);
    res.status(200).json({ message: 'Videos retrieved successfully', data: videos });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

// Read (Get) a video by ID
const getVideoById = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: 'Video not found', data: null });
    res.status(200).json({ message: 'Video retrieved successfully', data: video });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

const getVideosByRestaurantId = async (req, res) => {
  const { restaurantId } = req.params;
  try {
    const projection = { name:1,link:1 };
    const videos = await Video.find({ restaurantId },projection);
    res.status(200).json({ message: 'Videos retrieved successfully', data: videos });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
}

// Update a video by ID
const updateVideo = async (req, res) => {
  try {
    const updatedVideo = await Video.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedVideo) return res.status(404).json({ message: 'Video not found', data: null });
    res.status(200).json({ message: 'Video updated successfully', data: updatedVideo });
  } catch (error) {
    res.status(400).json({ message: error.message, data: null });
  }
};

// Delete a video by ID
const deleteVideo = async (req, res) => {
  try {
    const deletedVideo = await Video.findByIdAndDelete(req.params.id);
    if (!deletedVideo) return res.status(404).json({ message: 'Video not found', data: null });
    res.status(200).json({ message: 'Video deleted successfully', data: deletedVideo });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

async function getVideosByRestaurant(restaurantId, type) {
  return await Video.find({ restaurantId, type });
}

async function getVideosByTypeAndState(type, state) {
  const videos = await Video.aggregate([
    {
      $lookup: {
        from: 'restaurants',
        localField: 'restaurantId',
        foreignField: '_id',
        as: 'restaurant'
      }
    },
    { $unwind: '$restaurant' },
    { $match: { type, 'restaurant.address.state': state } },
    {
      $project: {
        _id: 1,
        likes: 1,
        comments: 1,
        link: 1,
        ctaText: 1,
        restaurantId: 1,
        type: 1,
        name: 1,
        'restaurant.name': 1,
        'restaurant.address.latitude': 1,
        'restaurant.address.longitude': 1,
        'restaurant.address.streetAddress': 1,
        'restaurant.rating': 1,
        'restaurant.foodType': 1,
        'restaurant.cuisines': 1,
        'restaurant.avgCosts': 1
      }
    }
  ]);
  return videos;
}

const getVideosForRestaurant = async (restaurantId) => {
  return Video.find({ type: 'dining', restaurantId });
};

const getVideosForFoodItem = async (foodItemId) => {
  return Video.find({ type: 'delivery', foodItemId });
}

module.exports = {
  createVideo,
  getAllVideos,
  getVideoById,
  updateVideo,
  deleteVideo,
  getVideosByRestaurantId,
  VideoController,
  getVideosByRestaurant,
  getVideosByTypeAndState,
  getVideosForRestaurant,
  getVideosForFoodItem
};
