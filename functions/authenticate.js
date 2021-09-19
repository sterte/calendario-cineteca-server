var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var User = require('./models/user');
var JwtStrategy = require('passport-jwt').Strategy;
var ExtractJwt = require('passport-jwt').ExtractJwt;
var jwt = require('jsonwebtoken');
//var FacebookTokenStrategy = require('passport-facebook-token');
//var GoogleTokenStrategy = require('passport-google-oauth2');

var config = require('./config');

exports.local = passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

exports.getToken = function(user){
    return jwt.sign(user, config.secretKey, {expiresIn: 3600});
};

var opts = {};
opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
opts.secretOrKey = config.secretKey;

exports.jwtPassport = passport.use(new JwtStrategy(opts, (jwt_payload, done) => {
    console.log('JWT payload: ', jwt_payload);
    User.findOne({_id: jwt_payload._id}, (err, user) => {
        if(err){
            return done(err, false);
        }
        else if(user){
            return done(null, user);
        }
        else{
            return done(null, false);
        }
    })
}));

exports.verifyUser = passport.authenticate('jwt', {session: false});
exports.verifyAdmin = (req, res, next) => {
    if(req.user.admin){
        return next();
    }
    else{
        var err = new Error('You are not authorized to perform this operation');
        err.status = 403;        
        return next(err);
    }
};


/*
const manageLocalUser = (accessToken, refreshToken, profile, done) => { //profile mantains info populated by 3rd party (i.e. facebook)        
    User.findOne({oauthID: profile.id}, (err, user) => {            
        if(err) {                 
            return done(err, false);
        }
        if(!err && user != null){ //user with oauthID exists                
            return done(null, user);
        }
        else { //no error but no user with oauthID found                
            user = new User({
                username: profile.displayName
            });
            //user.oauthID = profile.id;
            user.firstname = profile.name.givenName;
            user.lastname = profile.name.familyName;
            user.save((err, user) => {                    
                if(err){
                    return done(err, false);
                }
                else{
                    return done(null, user);
                }
            });                
        }
    });        
}


exports.facebookPassport = passport.use(new FacebookTokenStrategy({
    clientID: config.facebook.clientId,
    clientSecret: config.facebook.clientSecret
    },
    manageLocalUser
));

exports.googlePassport = passport.use(new GoogleTokenStrategy({
    clientID: config.google.clientId,
    clientSecret: config.google.clientSecret,
    callbackURL: config.google.redirect_uri
    },
    manageLocalUser
));
*/


