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

const app = express();

// ================= CORE MIDDLEWARE STACK =================

// 💡 0. Trust Vercel Proxy (ضروري جداً لعمل الـ Rate Limiter وجمع الـ IPs بشكل صحيح على Vercel)
app.set('trust proxy', 1);

// 1. Set Security HTTP Headers
//app.use(helmet());
//app.use(helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }));

// 2. CORS Configuration (Dynamic & Robust for Vercel/Localhost)
const corsOptions = {
  origin: function (origin, callback) {
    // السماح ديناميكياً بأي Origin يطلب البيانات (مثالي لبيئة الـ Preview والـ Localhost)
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Accept', 
    'Set-Cookie'
  ],
  optionsSuccessStatus: 204 // لضمان استجابة سريعة لطلبات الـ OPTIONS القديمة
};

// تفعيل الـ CORS للميدل وير العام
app.use(cors(corsOptions));

// 💡 3. Explicit Preflight Handler (حل مشكلة الـ OPTIONS الـ "عنيدة" في Vercel)
app.options('*', cors(corsOptions));

// 4. Development Request Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// 5. Rate Limiting (تأكد أن trust proxy مفعل ليعمل بشكل صحيح)
const limiter = rateLimit({
  max: 5000, // رفعنا الحد قليلاً لضمان عدم حدوث بلوك أثناء التيست المكثف
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// 6. Body Parsers (CRITICAL FOR VANILLA JS)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 7. CUSTOM NoSQL Injection Sanitizer
app.use((req, res, next) => {
  if (req.body) req.body = mongoSanitize.sanitize(req.body);
  if (req.params) req.params = mongoSanitize.sanitize(req.params);

  if (req.query) {
    const cleanedQuery = mongoSanitize.sanitize(req.query);
    for (const key in req.query) {
      delete req.query[key];
    }
    Object.assign(req.query, cleanedQuery);
  }
  next();
});

// 8. HTTP Parameter Pollution Prevention
app.use(hpp());

// 9. Static File Serving
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

// ================= ERROR HANDLING =================
app.all(/(.*)/, (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;