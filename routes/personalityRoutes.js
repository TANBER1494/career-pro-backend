const express = require('express');
const personalityController = require('../controllers/personalityController');
const authController = require('../controllers/authController'); // أو authMiddleware حسب ما بتسميه

const router = express.Router();

// حماية جميع المسارات القادمة (يجب أن يكون مسجل دخول)
// والتأكد أنه Job Seeker فقط (الشركات لا تمتحن!)
router.use(authController.protect); 
router.use(authController.restrictTo('job_seeker'));

// مسار جلب الأسئلة
router.get('/questions', personalityController.getQuestions);

// مسار إرسال الإجابات واستلام النتيجة
router.post('/submit', personalityController.submitTest);

module.exports = router;