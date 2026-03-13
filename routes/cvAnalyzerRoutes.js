const express = require('express');
const cvAnalyzerController = require('../controllers/cvAnalyzerController'); // تأكد إن الاسم مطابق لملفك
const upload = require('../utils/fileUpload'); 
const authMiddleware = require('../middlewares/authMiddleware'); // 💡 التعديل هنا: استدعاء الميدل وير الصحيح

const router = express.Router();

// ============================================================
// 🚀 AI Routes: CV Analyzer & ATS Checker
// ============================================================

// 1. حماية جميع مسارات هذا الملف (يجب أن يكون مسجل دخول)
router.use(authMiddleware.protect);


// 1. مسار جلب آخر نتيجة تحليل (GET) - 🚨 أضفناه هنا 🚨
router.get(
  '/analyze-cv/latest',
  authMiddleware.restrictTo('job_seeker'),
  cvAnalyzerController.getLatestAnalysis
);

// 2. مسار تحليل السيرة الذاتية
router.post(
  '/analyze-cv',
  authMiddleware.restrictTo('job_seeker'), // السماح لطلبة العمل فقط
  upload.single('cvFile'), // أداة الرفع السحابية
  cvAnalyzerController.analyzeCV // الكنترولر الذي يكلم الـ AI
);

module.exports = router;