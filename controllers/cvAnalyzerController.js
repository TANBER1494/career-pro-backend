const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const aiService = require('../utils/aiService');
const AiAnalysisRequest = require('../models/AiAnalysisRequest');
const JobSeeker = require('../models/JobSeeker');
const JobRecommendation = require('../models/JobRecommendation');

// ============================================================
// 🚀 1. CV Analyzer & ATS Checker Controller
// ============================================================
exports.analyzeCV = catchAsync(async (req, res, next) => {
  // 1. التحقق من المدخلات (Validation)
  // Multer المفروض رفع الملف وحط الرابط في req.file.path
  if (!req.file || !req.file.path) {
    return next(
      new AppError('Please upload your CV (PDF or Word document).', 400)
    );
  }

  const cvUrl = req.file.path; // الرابط المباشر من Cloudinary
  const jobDescription = req.body.jobDescription;

  if (!jobDescription || jobDescription.trim() === '') {
    return next(
      new AppError(
        'Please provide a Job Description to compare the CV against.',
        400
      )
    );
  }

  // 2. إنشاء سجل مبدئي في الداتابيز لتتبع الطلب (Request Tracking)
  let analysisRecord = await AiAnalysisRequest.create({
    seekerId: req.user.id,
    requestStatus: 'processing', // الحالة الآن: قيد المعالجة
    requestData: {
      cvUrl: cvUrl,
      jobDescription: jobDescription,
    },
  });

  await JobSeeker.findOneAndUpdate(
    { authId: req.user.id }, // ابحث عن بروفايل اليوزر
    { cvUrl: cvUrl }, // حدث رابط الـ CV
    { new: true, runValidators: false }
  );

  try {
    // 1. إرسال الداتا للذكاء الاصطناعي
    const aiResponse = await aiService.analyzeCV(cvUrl, jobDescription);

    // 2. تحديث سجل الطلب بنجاح
    analysisRecord.requestStatus = 'completed';
    analysisRecord.responseData = aiResponse;
    analysisRecord.processedAt = Date.now();
    await analysisRecord.save();

    // 🚨 التصحيح السحري: جلب بروفايل طالب العمل أولاً للحصول على الـ _id الصحيح
    const seekerProfile = await jobSeekerModel.findOne({ authId: req.user.id });

    if (seekerProfile) {
        // الآن نمسح باستخدام seekerProfile._id وليس req.user.id
        await JobRecommendation.deleteMany({ seekerId: seekerProfile._id });
        console.log(`🗑️ Cache cleared for Seeker: ${seekerProfile._id}`);
    }

    // 3. إرسال النتيجة للفرونت إند
    res.status(200).json({
      status: 'success',
      message: 'CV analyzed successfully. Old matches cleared.',
      data: {
        analysisId: analysisRecord._id,
        result: aiResponse
      },
    });

  } catch (error) {
    // 🚨 6. معالجة الفشل بذكاء
    // لو الـ AI ضرب إيرور (Timeout أو غيره)، لازم نحدث السجل في الداتابيز عشان ميفضلش معلق
    analysisRecord.requestStatus = 'failed';
    analysisRecord.responseData = { error: error.message };
    await analysisRecord.save();

    // تمرير الخطأ للـ Global Error Handler عشان يظهر لليوزر
    return next(
      new AppError(
        error.message || 'Failed to analyze CV. Please try again later.',
        500
      )
    );
  }
});

// ============================================================
// 🚀 2. Get Latest CV Analysis Result Controller
// ============================================================
exports.getLatestAnalysis = catchAsync(async (req, res, next) => {
  // 1. البحث في الداتابيز عن أحدث ريكويست مكتمل لهذا المستخدم
  const latestAnalysis = await AiAnalysisRequest.findOne({
    seekerId: req.user.id,
    requestStatus: 'completed',
  }).sort('-createdAt'); // الفرز تنازلياً لجلب الأحدث (الأخير)

  // 2. لو مفيش أي ريكويست سابق (اليوزر جديد)
  if (!latestAnalysis) {
    return res.status(200).json({
      status: 'success',
      data: null, // نرسل null عشان الفرونت إند يفهم ويفتح شاشة الرفع
    });
  }

  // 3. لو لقينا نتيجة، نرجعها بنفس الهيكل اللي الفرونت إند متعود عليه
  res.status(200).json({
    status: 'success',
    data: {
      analysisId: latestAnalysis._id,
      result: latestAnalysis.responseData, // الـ JSON الخاص بـ Azure محفوظ هنا
    },
  });
});
