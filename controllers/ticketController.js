// controllers/ticketController.js
const Ticket = require('../models/ticket');

// Create a new ticket
const createTicket = async (req, res) => {
  try {
    const newTicket = new Ticket(req.body);
    const savedTicket = await newTicket.save();
    res.status(201).json({ message: 'Ticket created successfully', data: savedTicket });
  } catch (error) {
    res.status(400).json({ message: error.message, data: null });
  }
};

// Read (Get) all tickets
const getAllTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find();
    res.status(200).json({ message: 'Tickets retrieved successfully', data: tickets });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

// Read (Get) a ticket by ID
const getTicketById = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found', data: null });
    res.status(200).json({ message: 'Ticket retrieved successfully', data: ticket });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

// Update a ticket by ID
const updateTicket = async (req, res) => {
  try {
    const updatedTicket = await Ticket.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedTicket) return res.status(404).json({ message: 'Ticket not found', data: null });
    res.status(200).json({ message: 'Ticket updated successfully', data: updatedTicket });
  } catch (error) {
    res.status(400).json({ message: error.message, data: null });
  }
};

// Delete a ticket by ID
const deleteTicket = async (req, res) => {
  try {
    const deletedTicket = await Ticket.findByIdAndDelete(req.params.id);
    if (!deletedTicket) return res.status(404).json({ message: 'Ticket not found', data: null });
    res.status(200).json({ message: 'Ticket deleted successfully', data: deletedTicket });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

module.exports = {
  createTicket,
  getAllTickets,
  getTicketById,
  updateTicket,
  deleteTicket
};
