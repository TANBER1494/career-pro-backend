const express = require('express');
const authController = require('../controllers/authController');
const cvAnalyzerController = require('../controllers/cvAnalyzerController'); // عدل المسار حسب اسم ملفك
const upload = require('../utils/fileUpload'); // ملف multer اللي رفعتهولي

const router = express.Router();

// ============================================================
// 🚀 AI Routes: CV Analyzer & ATS Checker
// ============================================================

// نطبق حماية تسجيل الدخول على كل مسارات الـ AI الجاية
router.use(authController.protect);

// مسار تحليل السيرة الذاتية
router.post(
  '/analyze-cv',
  authController.restrictTo('job_seeker'), // (اختياري) تأكيد إن طالب العمل بس هو اللي يحلل الـ CV
  upload.single('cvFile'), // 'cvFile' ده المفتاح اللي الـ multer بيستناه بناءً على كودك
  cvAnalyzerController.analyzeCV
);

module.exports = router;