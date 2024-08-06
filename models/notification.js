// models/notification.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const notificationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  description: { type: String, required: true },
  onClickRedirectURL: { type: String, required: true },
  status: { type: String, required: true },
  image: { type: String, required: true }
});

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
