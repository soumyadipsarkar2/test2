const mongoose = require('mongoose');
const { Schema } = mongoose;

const ticketSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  createdAt: { type: Number, required: true }
});

const Ticket = mongoose.model('Ticket', ticketSchema);

module.exports = Ticket;
