const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const JobSeeker = require('../models/JobSeeker');
const Job = require('../models/Job');
const JobRecommendation = require('../models/JobRecommendation');
const aiService = require('../utils/aiService');

exports.generateMatches = catchAsync(async (req, res, next) => {
 // 1. التحقق من وجود اليوزر والـ CV
  const seeker = await JobSeeker.findOne({ authId: req.user.id });
  if (!seeker || !seeker.cvUrl) {
    return next(new AppError('Please analyze your CV first.', 400));
  }

  // 🚨 اللوجيك الجديد: البحث عن توصيات سابقة محفوظة لهذا المستخدم
  const existingRecommendations = await JobRecommendation.find({ 
    seekerId: seeker._id, 
    recommendationSource: 'cv_matching' 
  }).populate({
    path: 'jobId',
    populate: { path: 'companyId', select: 'companyName logoUrl industry location' }
  }).lean();

  // لو لقينا نتائج قديمة، نرجعها فوراً ونوقف التنفيذ هنا (Caching)
  if (existingRecommendations.length > 0) {
    const formattedMatches = existingRecommendations.map(rec => ({
      matchPercentage: rec.matchPercentage,
      jobDetails: rec.jobId
    }));

    return res.status(200).json({
      status: 'success',
      results: formattedMatches.length,
      message: 'Retrieved last matching results.',
      data: { matches: formattedMatches }
    });
  }

  // ==========================================================
  // 2. Lean Database Query (جلب الوظائف برونق وسرعة)
  // ==========================================================
  // نسحب فقط الوظائف النشطة، ونحدد الحقول التي يحتاجها الـ AI فقط لتقليل استهلاك الـ Memory
  const availableJobs = await Job.find({ isActive: true, status: 'published' })
    .select('_id title description requirements skills salaryMax workPlace')
    .lean(); // lean() makes the query 3x faster by returning raw JS objects instead of Mongoose Documents

  if (!availableJobs || availableJobs.length === 0) {
    return next(
      new AppError(
        'No published jobs available for matching at the moment.',
        404
      )
    );
  }

  // ==========================================================
  // 3. Payload Formatting (تجهيز طرد البيانات للذكاء الاصطناعي)
  // ==========================================================
  const userProfilePayload = {
    title: seeker.jobTitle || 'Job Seeker',
    skills: seeker.skills || [],
    location: seeker.location || 'Not specified',
    expected_salary: seeker.expectedSalary || 0,
    workPlace: seeker.workPlace || 'hybrid',
  };

  const jobsListPayload = availableJobs.map((job) => ({
    _id: job._id.toString(),
    title: job.title,
    description: job.description,
    requirements: job.requirements || 'Not specified',
    skills: job.skills || [],
    salaryMax: job.salaryMax || 0,
    workPlace: job.workPlace || 'on_site',
  }));

  // ==========================================================
  // 4. AI Communication (إرسال الطلب لـ Azure AI)
  // ==========================================================
  // سيأخذ حوالي 25-30 ثانية كما أخبرنا فريق الـ AI
  const aiMatches = await aiService.matchJobs(
    seeker.cvUrl,
    userProfilePayload,
    jobsListPayload
  );

  if (!aiMatches || aiMatches.length === 0) {
    return next(
      new AppError('AI failed to find suitable matches for your profile.', 404)
    );
  }

  // ==========================================================
  // 5. Data Parsing & DB Enrichment (تنظيف البيانات ودمجها)
  // ==========================================================
  // استخراج أرقام الوظائف (IDs) التي اختارها الـ AI
  const matchedJobIds = aiMatches.map((match) => match.job_id);

  // جلب التفاصيل الكاملة لهذه الوظائف من الداتابيز (بما فيها تفاصيل الشركة مثل اللوجو)
  const populatedJobs = await Job.find({ _id: { $in: matchedJobIds } })
    .populate({
      path: 'companyId',
      select: 'companyName logoUrl industry location',
    })
    .lean();

  // دمج نسبة الـ AI مع تفاصيل الوظيفة الكاملة وتحويل النسبة لرقم
  const finalResults = aiMatches
    .map((aiMatch) => {
      // تنظيف النسبة: "93.9%" -> 93.9
      const cleanScore = parseFloat(aiMatch.match_score.replace('%', ''));

      // البحث عن الوظيفة المطابقة في البيانات التي جلبناها
      const fullJobDetails = populatedJobs.find(
        (job) => job._id.toString() === aiMatch.job_id
      );

      return {
        matchPercentage: cleanScore,
        jobDetails: fullJobDetails,
      };
    })
    .filter((result) => result.jobDetails); // فلترة أي وظيفة ربما تم مسحها أثناء الريكويست

  // ترتيب النتائج تنازلياً (من الأعلى تطابقاً للأقل)
  finalResults.sort((a, b) => b.matchPercentage - a.matchPercentage);

  // ==========================================================
  // 6. Bulk DB Operations (حفظ النتائج للتاريخ)
  // ==========================================================
  // نمسح الترشيحات القديمة لهذا المستخدم (لكي لا تتضخم الداتابيز)
  await JobRecommendation.deleteMany({
    seekerId: seeker._id,
    recommendationSource: 'cv_matching',
  });

  // نجهز مصفوفة للحفظ المجمع (Bulk Insert)
  const recommendationsToSave = finalResults.map((res) => ({
    seekerId: seeker._id,
    jobId: res.jobDetails._id,
    matchPercentage: res.matchPercentage,
    recommendationSource: 'cv_matching',
  }));

  // نحفظ في الداتابيز بضربة واحدة
  await JobRecommendation.insertMany(recommendationsToSave);

  // ==========================================================
  // 7. Client Response (الرد الاحترافي للفرونت إند)
  // ==========================================================
  res.status(200).json({
    status: 'success',
    results: finalResults.length,
    message: 'AI Matching completed successfully.',
    data: {
      matches: finalResults,
    },
  });
});
