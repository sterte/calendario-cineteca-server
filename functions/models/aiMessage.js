var mongoose = require('mongoose');
const { use } = require('passport');
var Schema = mongoose.Schema;

var AiMessage = new Schema({
    conversation: {
        type: Schema.Types.ObjectId,
        ref: 'AiConversation',
        required: true,        
    },
    content: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        required: true
    },
    role: {
        type: String,
        required: true
    }
});



module.exports = mongoose.model('AiMessage', AiMessage);