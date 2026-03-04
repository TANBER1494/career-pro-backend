const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const aiService = require('../utils/aiService'); // تأكد من مسار aiService عندك
const JobSeeker = require('../models/JobSeeker');
const PersonalityTest = require('../models/PersonalityTest');

// استدعاء ملفات الـ AI (قاعدة البيانات الثابتة)
const questionsData = require('../utils/aiData/selected_features.json');
const mbtiClasses = require('../utils/aiData/mbti_classes.json');
const dictionary = require('../utils/aiData/dictionary.json');

// ============================================================
// 1. Get 30 Questions
// ============================================================
exports.getQuestions = catchAsync(async (req, res, next) => {
  res.status(200).json({
    status: 'success',
    results: questionsData.length,
    data: {
      questions: questionsData,
    },
  });
});

// ============================================================
// 2. Submit Test & Get Results
// ============================================================
exports.submitTest = catchAsync(async (req, res, next) => {
  const { answers } = req.body;

  // 1. التحقق من صحة المدخلات (Validation)
  if (!answers || !Array.isArray(answers) || answers.length !== 30) {
    return next(new AppError('Please provide exactly 30 answers in an array format.', 400));
  }

  // 2. جلب بروفايل المستخدم (JobSeeker) بناءً على الـ Token
  // نفترض هنا أن الـ protect middleware يضع بيانات المستخدم في req.user
  const seeker = await JobSeeker.findOne({ authId: req.user.id });
  if (!seeker) {
    return next(new AppError('Job seeker profile not found.', 404));
  }

  // 3. إرسال الإجابات للوسيط الذكي (AI Service)
  const aiResult = await aiService.analyzePersonality(answers);
  const predictedIndex = aiResult.prediction; // رقم من 0 لـ 15

  // 4. ترجمة الرقم إلى MBTI واستخراج التفاصيل
  const mbtiType = mbtiClasses[predictedIndex]; // مثلاً: "ISFP"
  const mbtiDetails = dictionary[mbtiType];     // بيانات الشخصية من القاموس

  if (!mbtiDetails) {
    return next(new AppError('Error mapping personality type from AI.', 500));
  }

  // 5. حفظ نسخة أرشيفية في جدول الاختبارات (History)
  await PersonalityTest.create({
    seekerId: seeker._id,
    personalityTypeCode: mbtiType,
    testStatus: 'completed',
    userAnswers: { answersArray: answers }, // حفظ المصفوفة 
    aiRawAnalysis: aiResult,
    completionTime: Date.now(),
  });

  // 6. تحديث النتيجة النهائية في البروفايل لسرعة الاسترجاع (Denormalization)
  seeker.mbtiType = mbtiType;
  await seeker.save();

  // 7. إرسال الرد النهائي للفرونت إند (مُنسق جاهز للواجهة)
  res.status(200).json({
    status: 'success',
    data: {
      personalityType: `${mbtiType}: ${mbtiDetails.title}`,
      summary: mbtiDetails.description,
      suggestedCareers: mbtiDetails.suggestedCareers,
    },
  });
});