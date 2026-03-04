const express = require('express');
const personalityController = require('../controllers/personalityController');

// 💡 التعديل هنا: استدعاء ملف الـ Middleware الصحيح
// (تأكد إن مسار مجلد middlewares صحيح بناءً على هيكلة مشروعك)
const authMiddleware = require('../middlewares/authMiddleware'); 

const router = express.Router();

// حماية جميع المسارات القادمة (يجب أن يكون مسجل دخول)
// والتأكد أنه Job Seeker فقط (الشركات لا تمتحن!)
router.use(authMiddleware.protect); 
router.use(authMiddleware.restrictTo('job_seeker'));

// مسار جلب الأسئلة
router.get('/questions', personalityController.getQuestions);

// مسار إرسال الإجابات واستلام النتيجة
router.post('/submit', personalityController.submitTest);

module.exports = router;