const mongoose = require('mongoose');

const cachedDataSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true }
});

const CachedData = mongoose.model('CachedData', cachedDataSchema);

module.exports = CachedData;