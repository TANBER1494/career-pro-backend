const Company = require("../models/Company");
const Job = require("../models/Job");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

// ============================================================
// 1. Get Top Companies (Random 6 Verified Companies)
// ============================================================
exports.getTopCompanies = catchAsync(async (req, res, next) => {
  const companies = await Company.aggregate([
    // 1) Filter: Verified Only
    { $match: { isVerified: true } },

    // 2) Sample: Select 6 random
    { $sample: { size: 6 } },

    {
      $lookup: {
        from: "jobs",
        let: { companyId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$companyId", "$$companyId"] },
              status: "published",
            },
          },
        ],
        as: "activeJobs",
      },
    },

    // 4) Add Field: Count the jobs
    {
      $addFields: {
        openPositionsCount: { $size: "$activeJobs" },
      },
    },

    // 5) Project: Select fields
    {
      $project: {
        _id: 1,
        companyName: 1,
        logoUrl: 1,
        industry: 1,
        location: 1,
        isVerified: 1,
        openPositionsCount: 1, // ✅ نرجع العدد
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

  // Query Setup
  let query = Company.find(queryObj).select(
    "companyName logoUrl industry location companySize isVerified"
  );

  // --- Sorting ---
  if (req.query.sort) {
    const sortBy = req.query.sort.split(",").join(" ");
    query = query.sort(sortBy);
  } else {
    query = query.sort("-createdAt");
  }

  // --- Pagination ---
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 50;
  const skip = (page - 1) * limit;

  query = query.skip(skip).limit(limit);

  // Execute Query (Get Companies)
  const companies = await query;

  // ACTION: Count Jobs for each company (Manual Population)
  const companiesWithCounts = await Promise.all(
    companies.map(async (comp) => {
      // نعد الوظائف المنشورة لهذه الشركة
      const count = await Job.countDocuments({
        companyId: comp._id,
        status: "published",
      });

      // نحول مستند Mongoose إلى Object عادي ونضيف العدد
      const compObj = comp.toObject();
      compObj.openPositionsCount = count;
      return compObj;
    })
  );

  res.status(200).json({
    status: "success",
    results: companiesWithCounts.length,
    data: { companies: companiesWithCounts },
  });
});

// ============================================================
// 3. Get Company Details (No Change needed here)
// ============================================================
exports.getCompanyDetails = catchAsync(async (req, res, next) => {
  const company = await Company.findById(req.params.id).select(
    "-authId -verificationProgress -verificationStatus"
  );

  if (!company) {
    return next(new AppError("Company not found", 404));
  }

  const companyJobs = await Job.find({
    companyId: company._id,
    status: "published",
  }).select("title location type salaryMin salaryMax postedDate skills");

  res.status(200).json({
    status: "success",
    data: {
      company,
      openPositions: companyJobs,
    },
  });
});
