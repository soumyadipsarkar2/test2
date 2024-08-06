// routes/offerRoutes.js
const express = require('express');
const {
  createOffer,
  getOffers,
  getOfferById,
  updateOffer,
  deleteOffer
} = require('../controllers/offerController');

const router = express.Router();

router.post('/offers', createOffer);
router.get('/offers', getOffers);
router.get('/offers/:id', getOfferById);
router.put('/offers/:id', updateOffer);
router.delete('/offers/:id', deleteOffer);

module.exports = router;
