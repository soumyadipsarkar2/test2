const mongoose = require('mongoose');
const { Schema } = mongoose;

const supportChatSchema = new Schema({
  message: { type: String, required: true },
  timeOfMessage: { type: Number, required: true },
  sender: { type: String, required: true },
  ticketId: { type: Schema.Types.ObjectId, required: true, ref: 'Ticket' },
  imageLink: String
});

const SupportChat = mongoose.model('SupportChat', supportChatSchema);

module.exports = SupportChat;
