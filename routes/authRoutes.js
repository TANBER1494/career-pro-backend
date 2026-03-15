const express = require("express");
const authController = require("../controllers/authController");
const authMiddleware = require("../middlewares/authMiddleware");
const router = express.Router();
const rateLimit = require('express-rate-limit');


// ============================================================
// 🚨 Strict Security: Brute Force Protection for Login
// ============================================================
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 5, // الحد الأقصى 5 محاولات لكل IP
  message: {
    status: 'error',
    message: 'Too many login attempts from this IP, please try again after 15 minutes. 🚫'
  },
  // إعدادات Vercel Proxy لضمان قراءة الـ IP الحقيقي
  validate: {
    xForwardedForHeader: false, 
    trustProxy: true,
    default: true
  }
});


router.post("/signup", authController.signup);
router.post('/login', loginLimiter, authController.login);
router.post("/verify-email", authController.verifyEmail);
router.post("/resend-code", authController.resendVerificationCode);

router.post("/forgot-password", authController.forgotPassword);
router.patch("/reset-password/:token", authController.resetPassword);



// Test Protected Route
router.get("/test-protect", authMiddleware.protect, (req, res) => {
  res.status(200).json({
    status: "success",
    message: "You are authorized!",
    user: req.user,
  });
});

router.use(authMiddleware.protect);
router.get("/me", authController.getMe);

module.exports = router;
