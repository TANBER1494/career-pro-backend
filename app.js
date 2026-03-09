const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const path = require('path');

// Core Security Modules
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');

// Custom Modules
const AppError = require('./utils/AppError');
const adminRouter = require('./routes/adminRoutes');
const globalErrorHandler = require('./controllers/errorController');

// Import Routes
const authRouter = require('./routes/authRoutes');
const jobSeekerRouter = require('./routes/jobSeekerRoutes');
const companyRouter = require('./routes/companyRoutes');
const jobRouter = require('./routes/jobRoutes');
const applicationRouter = require('./routes/applicationRoutes');
const personalityRouter = require('./routes/personalityRoutes');

const app = express();
// ============================================================
// 💡 Vercel Proxy Fix: 
// ============================================================
app.set('trust proxy', 1);

// 1. Set Security HTTP Headers
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }));

// 2. CORS Configuration (Crucial for Vanilla JS Fetch/XHR)
const allowedOrigins = [
  'https://aicareerpro.vercel.app',
  'https://careerpro.me',
  'https://www.careerpro.me',
  'https://careerpro.dev',
  'https://www.careerpro.dev',
  'https://careerpro.works',
  'https://www.careerpro.works', 
  'http://localhost:5173',
];

app.use(
  cors({
    origin: function (origin, callback) {
      // السماح بالطلبات اللي ملهاش Origin (زي الـ Mobile apps أو Postman)
      // أو الطلبات اللي موجودة في القائمة بتاعتنا
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  })
);

// 3. Development Request Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// 4. Rate Limiting
const limiter = rateLimit({
  max: 1000,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!',
  // 💡 إرجاع التحققات مع إيقاف التحذير الخاص بـ Vercel فقط
  validate: {
    xForwardedForHeader: false, 
    trustProxy: true,
    default: true
  }
});
app.use('/api', limiter);

// 5. Body Parsers (CRITICAL FOR VANILLA JS)
// - Parses application/json (fetch API with JSON stringify)
app.use(express.json({ limit: '10kb' }));
// - Parses application/x-www-form-urlencoded (Standard HTML Forms & FormData)
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 6. CUSTOM NoSQL Injection Sanitizer (The Fix)
// Bypasses the "getter-only" Express error by mutating keys instead of the object
app.use((req, res, next) => {
  if (req.body) req.body = mongoSanitize.sanitize(req.body);
  if (req.params) req.params = mongoSanitize.sanitize(req.params);

  if (req.query) {
    // Sanitize the data first
    const cleanedQuery = mongoSanitize.sanitize(req.query);
    // Clear the existing keys safely
    for (const key in req.query) {
      delete req.query[key];
    }
    // Assign the cleaned data back into the read-only object
    Object.assign(req.query, cleanedQuery);
  }
  next();
});

// 7. HTTP Parameter Pollution Prevention
app.use(hpp());

// 8. Static File Serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Welcome Route
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Welcome to CareerPro API! 🚀',
    version: '1.0.0',
  });
});

// ================= ROUTES MOUNTING =================
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/job-seeker', jobSeekerRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/companies', companyRouter);
app.use('/api/v1/jobs', jobRouter);
app.use('/api/v1/applications', applicationRouter);


app.use('/api/v1/personality', personalityRouter);

// ================= ERROR HANDLING =================
app.all(/(.*)/, (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});



app.use(globalErrorHandler);

module.exports = app;
