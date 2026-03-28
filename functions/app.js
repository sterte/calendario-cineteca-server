const createError = require('http-errors');
const express = require('express');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const passport = require('passport');
const compression = require('compression');
const helmet = require('helmet');
const authenticate = require('./authenticate');
const config = require('./config');
const rateLimit = require('express-rate-limit');

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const daysRouter = require('./routes/dayRouter');
const moviesRouter = require('./routes/movieRouter');
const favouritesRouter = require('./routes/favouriteRouter');
const trackRouter = require('./routes/trackRouter');
const chatRouter = require('./routes/chatRouter');
const ccbDayRouter = require('./routes/ccbDayRouter');
const ccbMovieRouter = require('./routes/ccbMovieRouter');
const ccbTrackRouter = require('./routes/ccbTrackRouter');
const popupDayRouter = require('./routes/popupDayRouter');
const popupMovieRouter = require('./routes/popupMovieRouter');
const gallieraDayRouter = require('./routes/gallieraDayRouter');
const gallieraMovieRouter = require('./routes/gallieraMovieRouter');
const imdbRouter = require('./routes/imdbRouter');
const letterboxdRouter = require('./routes/letterboxdRouter');
const cacheRouter = require('./routes/cacheRouter');

const mongoose = require('mongoose');

const url = config.mongoUrl;
const connect = mongoose.connect(url);

connect.then((db) => {
  console.log('Connected correctly to server');
})
.catch((err) => {
  console.log(err);
});

const app = express();

app.use(helmet());
app.use(compression());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));
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
app.use('/ccb-day', ccbDayRouter);
app.use('/ccb-movies', ccbMovieRouter);
app.use('/ccb-tracks', ccbTrackRouter);
app.use('/popup-day', popupDayRouter);
app.use('/popup-movies', popupMovieRouter);
app.use('/galliera-day', gallieraDayRouter);
app.use('/galliera-movies', gallieraMovieRouter);
app.use('/imdb', imdbRouter);
app.use('/letterboxd', letterboxdRouter);
app.use('/cache', cacheRouter);

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
