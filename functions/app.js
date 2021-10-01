var createError = require('http-errors');
var express = require('express');
var path = require('path');
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

const mongoose = require('mongoose');
const { signedCookies } = require('cookie-parser');

const url = config.mongoUrl;
const connect = mongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true });

connect.then((db) => {
  console.log('Connected correctly to server');
})
.catch((err) => {
  console.log(err);
});

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(helmet());
app.use(compression());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(passport.initialize());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/days', daysRouter);
app.use('/movies', moviesRouter);
app.use('/favourites', favouritesRouter);
app.use('/tracks', trackRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;