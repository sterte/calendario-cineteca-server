const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Favourite = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    title: {
        type: String,
        required: true
    },
    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 10,
        required: true
    },
    comment: {
        type: String,
        default: ''
    }
});

module.exports = mongoose.model('Favourite', Favourite);
