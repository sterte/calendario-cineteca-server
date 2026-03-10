const mongoose = require('mongoose');

const dailyStatSchema = new mongoose.Schema({
    date:    { type: String, required: true, unique: true }, // 'YYYY-MM-DD'
    hits:    { type: Number, default: 0 },
    misses:  { type: Number, default: 0 },
    reloads: { type: Number, default: 0 },
});

module.exports = mongoose.model('DailyStat', dailyStatSchema);
