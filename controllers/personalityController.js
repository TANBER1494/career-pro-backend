const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const aiService = require('../utils/aiService'); 
const JobSeeker = require('../models/JobSeeker');
const PersonalityTest = require('../models/PersonalityTest');

// استدعاء ملفات الـ AI (لم نعد بحاجة لـ mbtiClasses هنا ولكن سنتركه لو احتجته في مكان آخر)
const questionsData = require('../utils/aiData/selected_features.json');
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
    return next(
      new AppError('Please provide exactly 30 answers in an array format.', 400)
    );
  }

  // 2. جلب بروفايل المستخدم
  const seeker = await JobSeeker.findOne({ authId: req.user.id });
  if (!seeker) {
    return next(new AppError('Job seeker profile not found.', 404));
  }

  // 3. إرسال الإجابات للوسيط الذكي (AI Service)
  const aiResult = await aiService.analyzePersonality(answers);
  
  // 💡 التعديل الجوهري: الـ AI أصبح يرسل النص مباشرة (مثلاً "ENFP")
  const mbtiType = aiResult.prediction; 

  // 4. استخراج التفاصيل من القاموس مباشرة بناءً على النص
  const mbtiDetails = dictionary[mbtiType]; 

  if (!mbtiDetails) {
    return next(new AppError(`Error mapping personality type from AI. Received: ${mbtiType}`, 500));
  }

  // 5. حذف أي اختبار سابق قبل حفظ الجديد
  await PersonalityTest.deleteMany({ seekerId: seeker._id }); 

  // 6. حفظ نسخة أرشيفية في جدول الاختبارات
  await PersonalityTest.create({
    seekerId: seeker._id,
    personalityTypeCode: mbtiType,
    testStatus: 'completed',
    userAnswers: { answersArray: answers },
    aiRawAnalysis: aiResult,
    completionTime: Date.now(),
  });

  // 7. تحديث النتيجة النهائية في البروفايل لسرعة الاسترجاع
  seeker.mbtiType = mbtiType;
  await seeker.save();

  // 8. إرسال الرد النهائي للفرونت إند (مُنسق جاهز للواجهة)
  res.status(200).json({
    status: 'success',
    data: {
      personalityType: `${mbtiType}: ${mbtiDetails.title}`,
      summary: mbtiDetails.description,
      suggestedCareers: mbtiDetails.suggestedCareers,
    },
  });
});

// ============================================================
// 3. Get Existing Test Result
// ============================================================
exports.getTestResult = catchAsync(async (req, res, next) => {
  const seeker = await JobSeeker.findOne({ authId: req.user.id });

  if (!seeker) {
    return next(new AppError('Job seeker profile not found.', 404));
  }

  // لو لسه ممتحنش، نرجع null عشان الفرونت إند يعرف ويظهرله زرار Start Test
  if (!seeker.mbtiType) {
    return res.status(200).json({
      status: 'success',
      data: null,
    });
  }

  // لو امتحن، نجهزله النتيجة من القاموس
  const mbtiDetails = dictionary[seeker.mbtiType];

  res.status(200).json({
    status: 'success',
    data: {
      personalityType: `${seeker.mbtiType}: ${mbtiDetails.title}`,
      summary: mbtiDetails.description,
      suggestedCareers: mbtiDetails.suggestedCareers,
    },
  });
});