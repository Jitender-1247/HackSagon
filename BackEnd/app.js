var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');
var http = require('http');                                    // ADD
var dotenv = require('dotenv');
dotenv.config();

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var authRouter = require('./routes/auth');
var documentRouter = require('./routes/documents');            // ADD
var aiRouter = require('./services/aiService');                // ADD
var { initCollabSocket } = require('./services/collabSocket'); // ADD

require('./config/firebase');                                  // ADD - initialize Firebase

var rateLimit = require('express-rate-limit');                 // ADD
var helmet = require('helmet');                                // ADD

var app = express();
var server = http.createServer(app);                          // ADD

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(helmet());                                            // ADD
app.use(logger('dev'));
app.use(express.json({ limit: '2mb' }));                     // UPDATED
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true })); // UPDATED
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiters
const globalLimiter = rateLimit({ windowMs: 60 * 1000, max: 100 });  // ADD
const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 20 });        // ADD
app.use(globalLimiter);                                                 // ADD

// Routes
app.use('/', indexRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1', documentRouter);                          // ADD
app.use('/api/v1/ai', aiLimiter, aiRouter);                  // ADD

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

// WebSocket
initCollabSocket(server);                                     // ADD

module.exports = { app, server };                            // UPDATED