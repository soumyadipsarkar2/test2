const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserLikeSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true, enum: ['video', 'restaurant', 'foodItem'] },
    videoId: { type: Schema.Types.ObjectId, ref: 'Video' },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant' },
    foodItemId: { type: Schema.Types.ObjectId, ref: 'FoodItem' }
});

const UserLike = mongoose.model('UserLike', UserLikeSchema);
module.exports = UserLike;