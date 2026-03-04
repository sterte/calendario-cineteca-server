const mongoose = require('mongoose');

const cacheEntrySchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
    fetchedAt: { type: Number, required: true },
    expiresAt: { type: Number, required: true }
});

module.exports = mongoose.model('CacheEntry', cacheEntrySchema);
