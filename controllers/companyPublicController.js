const Company = require("../models/Company");
const Job = require("../models/Job");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

// ============================================================
// 1. Get Top Companies (Random 6 Verified Companies)
// ============================================================
exports.getTopCompanies = catchAsync(async (req, res, next) => {
  // بنستخدم Aggregate عشان نختار عشوائي ($sample)
  const companies = await Company.aggregate([
    // 1) هات الشركات الموثقة بس (عشان نعرض الأفضل في الصفحة الرئيسية)
    // ملحوظة: لو الداتابيز لسه فاضية ومفيش شركات موثقة، ممكن تشيل السطر ده مؤقتاً للتجربة
    { $match: { isVerified: true } },

    // 2) اختار 6 عشوائي
    { $sample: { size: 6 } },

    // 3) هات البيانات اللي تهم الزائر بس (مش كل حاجة)
    {
      $project: {
        _id: 1,
        companyName: 1,
        logoUrl: 1,
        industry: 1,
        location: 1,
        isVerified: 1,
      },
    },
  ]);

  res.status(200).json({
    status: "success",
    results: companies.length,
    data: { companies },
  });
});

// ============================================================
// 2. Get All Companies (Search & Filter & Pagination)
// ============================================================
exports.getAllCompanies = catchAsync(async (req, res, next) => {
  // --- Filtering ---
  const queryObj = { ...req.query };
  const excludedFields = ["page", "sort", "limit", "fields", "search"];
  excludedFields.forEach((el) => delete queryObj[el]);

  // --- Search by Name ---
  if (req.query.search) {
    queryObj.companyName = { $regex: req.query.search, $options: "i" };
  }

  // Select fields to display in the list
  let query = Company.find(queryObj).select(
    "companyName logoUrl industry location companySize isVerified"
  );

  // --- Pagination ---
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 12; // بنعرض 12 كارت في الصفحة
  const skip = (page - 1) * limit;
  query = query.skip(skip).limit(limit);

  const companies = await query;

  res.status(200).json({
    status: "success",
    results: companies.length,
    data: { companies },
  });
});

// ============================================================
// 3. Get Company Details & Active Jobs (Public View)
// ============================================================
exports.getCompanyDetails = catchAsync(async (req, res, next) => {
  // أ) هات بيانات الشركة
  const company = await Company.findById(req.params.id).select(
    "-authId -verificationProgress"
  ); // نخفي البيانات الحساسة

  if (!company) {
    return next(new AppError("Company not found", 404));
  }

  // ب) هات الوظايف النشطة (Published) بتاعتها
  // لاحظ: بنختار الحقول اللي هتظهر في الكارت الصغير بس
  const companyJobs = await Job.find({
    companyId: company._id,
    status: "published",
  }).select("title location type salaryMin salaryMax postedDate skills");

  res.status(200).json({
    status: "success",
    data: {
      company,
      jobs: companyJobs,
    },
  });
});
