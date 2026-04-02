var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var passportLocalMongoose = require('passport-local-mongoose');

var User = new Schema({
    firstname: {
        type: String,
        default: ''
    },
    lastname: {
        type: String,
        default: ''
    },
    admin: {
        type: Boolean,
        default: false
    },
    email: {
        type: String,
        default: ''
    },
    resetPasswordToken: {
        type: String,
        default: null
    },
    resetPasswordExpires: {
        type: Date,
        default: null
    },
    imdbEnabled: {
        type: Boolean,
        default: true
    },
    letterboxdEnabled: {
        type: Boolean,
        default: true
    },
    letterboxdUsername: {
        type: String,
        default: ''
    },
    preferredCalendar: {
        type: String,
        default: ''
    },
    autoSwitchTab: {
        type: Boolean,
        default: true
    }
});

User.plugin(passportLocalMongoose); //automatically adds support for username and hashed+salted password

module.exports = mongoose.model('User', User);