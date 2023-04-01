const { Number } = require('mongoose');
var mongoose = require('mongoose');
const { use } = require('passport');
var Schema = mongoose.Schema;

var AiConversation = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,        
    },
    title: {
        type: String,
        required: false
    },
    charachter: {
        type: String,
        required: true
    },
    conversationId: {
        type: Number,
        required: true
    }
});



module.exports = mongoose.model('AiConversation', AiConversation);