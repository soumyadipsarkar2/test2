// controllers/supportChatController.js
const SupportChat = require('../models/supportChat');

// Create a new support chat message
const createSupportChat = async (req, res) => {
  try {
    const newSupportChat = new SupportChat(req.body);
    const savedSupportChat = await newSupportChat.save();
    res.status(201).json({ message: 'Support chat message created successfully', data: savedSupportChat });
  } catch (error) {
    res.status(400).json({ message: error.message, data: null });
  }
};

// Read (Get) all support chat messages
const getAllSupportChats = async (req, res) => {
  try {
    const supportChats = await SupportChat.find();
    res.status(200).json({ message: 'Support chat messages retrieved successfully', data: supportChats });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

// Read (Get) a support chat message by ID
const getSupportChatById = async (req, res) => {
  try {
    const supportChat = await SupportChat.findById(req.params.id);
    if (!supportChat) return res.status(404).json({ message: 'Support chat message not found', data: null });
    res.status(200).json({ message: 'Support chat message retrieved successfully', data: supportChat });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

// Update a support chat message by ID
const updateSupportChat = async (req, res) => {
  try {
    const updatedSupportChat = await SupportChat.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedSupportChat) return res.status(404).json({ message: 'Support chat message not found', data: null });
    res.status(200).json({ message: 'Support chat message updated successfully', data: updatedSupportChat });
  } catch (error) {
    res.status(400).json({ message: error.message, data: null });
  }
};

// Delete a support chat message by ID
const deleteSupportChat = async (req, res) => {
  try {
    const deletedSupportChat = await SupportChat.findByIdAndDelete(req.params.id);
    if (!deletedSupportChat) return res.status(404).json({ message: 'Support chat message not found', data: null });
    res.status(200).json({ message: 'Support chat message deleted successfully', data: deletedSupportChat });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

module.exports = {
  createSupportChat,
  getAllSupportChats,
  getSupportChatById,
  updateSupportChat,
  deleteSupportChat
};
