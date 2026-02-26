var createError = require('http-errors');
var express = require('express');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
var FileStore = require('session-file-store')(session);
var passport = require('passport');
var compression = require('compression');
var helmet = require('helmet');
var authenticate = require('./authenticate');
var config = require('./config');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var daysRouter = require('./routes/dayRouter');
var moviesRouter = require('./routes/movieRouter');
var favouritesRouter = require('./routes/favouriteRouter');
var trackRouter = require('./routes/trackRouter');
var chatRouter = require('./routes/chatRouter');

const mongoose = require('mongoose');

const url = config.mongoUrl;
const connect = mongoose.connect(url);

connect.then((db) => {
  console.log('Connected correctly to server');
})
.catch((err) => {
  console.log(err);
});

var app = express();

app.use(helmet());
app.use(compression());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(passport.initialize());
app.use(cookieParser());

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/day', daysRouter);
app.use('/movies', moviesRouter);
app.use('/favourites', favouritesRouter);
app.use('/tracks', trackRouter);
app.use('/chat', chatRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.json({ message: err.message, status: err.status });
});

module.exports = app;
