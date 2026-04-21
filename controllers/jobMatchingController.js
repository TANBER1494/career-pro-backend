const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const JobSeeker = require('../models/JobSeeker');
const Job = require('../models/Job');
const JobRecommendation = require('../models/JobRecommendation');
const aiService = require('../utils/aiService');

exports.generateMatches = catchAsync(async (req, res, next) => {
  // 1. استلام أمر "الـ Force Refresh" من الفرونت إند
  const { refresh } = req.query;

  // 2. التحقق من وجود اليوزر والـ CV
  const seeker = await JobSeeker.findOne({ authId: req.user.id });
  if (!seeker || !seeker.cvUrl) {
    return next(new AppError('Please analyze your CV first.', 400));
  }

  // 🚨 3. اللوجيك المحدث: البحث عن توصيات سابقة محفوظة (فقط إذا لم يطلب المستخدم تحديثاً)
  if (refresh !== 'true') {
    const existingRecommendations = await JobRecommendation.find({ 
      seekerId: seeker._id, 
      recommendationSource: 'cv_matching' 
    }).populate({
      path: 'jobId',
      populate: { path: 'companyId', select: 'companyName logoUrl industry location' }
    }).lean();

    // لو لقينا نتائج قديمة ولم يُطلب التحديث، نرجعها فوراً ونوقف التنفيذ هنا (Caching)
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
  }

  // ==========================================================
  // 4. Lean Database Query (جلب الوظائف المتاحة حالياً)
  // ==========================================================
  const availableJobs = await Job.find({ isActive: true, status: 'published' })
    .select('_id title description requirements skills salaryMax workPlace')
    .lean(); 

  if (!availableJobs || availableJobs.length === 0) {
    return next(
      new AppError(
        'No published jobs available for matching at the moment.',
        404
      )
    );
  }

  // ==========================================================
  // 5. Payload Formatting (تجهيز طرد البيانات للذكاء الاصطناعي)
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
  // 6. AI Communication (إرسال الطلب لـ Azure AI)
  // ==========================================================
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
  // 7. Data Parsing & DB Enrichment (تنظيف البيانات ودمجها)
  // ==========================================================
  const matchedJobIds = aiMatches.map((match) => match.job_id);

  const populatedJobs = await Job.find({ _id: { $in: matchedJobIds } })
    .populate({
      path: 'companyId',
      select: 'companyName logoUrl industry location',
    })
    .lean();

  const finalResults = aiMatches
    .map((aiMatch) => {
      const cleanScore = parseFloat(aiMatch.match_score.replace('%', ''));
      const fullJobDetails = populatedJobs.find(
        (job) => job._id.toString() === aiMatch.job_id
      );

      return {
        matchPercentage: cleanScore,
        jobDetails: fullJobDetails,
      };
    })
    .filter((result) => result.jobDetails); 

  finalResults.sort((a, b) => b.matchPercentage - a.matchPercentage);

  // ==========================================================
  // 8. Bulk DB Operations (حفظ النتائج الجديدة وتحديث الأرشيف)
  // ==========================================================
  await JobRecommendation.deleteMany({
    seekerId: seeker._id,
    recommendationSource: 'cv_matching',
  });

  const recommendationsToSave = finalResults.map((res) => ({
    seekerId: seeker._id,
    jobId: res.jobDetails._id,
    matchPercentage: res.matchPercentage,
    recommendationSource: 'cv_matching',
  }));

  await JobRecommendation.insertMany(recommendationsToSave);

  // ==========================================================
  // 9. Client Response (الرد الاحترافي للفرونت إند)
  // ==========================================================
  res.status(200).json({
    status: 'success',
    results: finalResults.length,
    message: refresh === 'true' 
      ? 'Successfully refreshed and found new job matches!' 
      : 'AI Matching completed successfully.',
    data: {
      matches: finalResults,
    },
  });
});