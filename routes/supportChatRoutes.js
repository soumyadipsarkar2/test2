// routes/supportChatRoutes.js
const express = require('express');
const {
  createSupportChat,
  getAllSupportChats,
  getSupportChatById,
  updateSupportChat,
  deleteSupportChat
} = require('../controllers/supportChatController');

const router = express.Router();

router.post('/support-chats', createSupportChat);
router.get('/support-chats', getAllSupportChats);
router.get('/support-chats/:id', getSupportChatById);
router.put('/support-chats/:id', updateSupportChat);
router.delete('/support-chats/:id', deleteSupportChat);

module.exports = router;
