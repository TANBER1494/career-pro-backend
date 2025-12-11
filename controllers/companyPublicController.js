const Company = require("../models/Company");
const Job = require("../models/Job");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

// ============================================================
// 1. Get Top Companies (Random 6 Verified Companies)
// ============================================================
exports.getTopCompanies = catchAsync(async (req, res, next) => {
  // Use Aggregation to select random documents efficiently
  const companies = await Company.aggregate([
    // 1) Filter: Get only verified companies (To showcase the best)
    // Note: If DB is empty/has no verified companies, comment this out for testing
    { $match: { isVerified: true } },

    // 2) Sample: Select 6 random documents
    { $sample: { size: 6 } },

    // 3) Project: Select only public-facing fields
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

  // Initialize Query with field selection
  let query = Company.find(queryObj).select(
    "companyName logoUrl industry location companySize isVerified"
  );

  // --- Sorting (ADDED FIX) ---
  // Always add a default sort to ensure consistent pagination
  if (req.query.sort) {
    const sortBy = req.query.sort.split(",").join(" ");
    query = query.sort(sortBy);
  } else {
    query = query.sort("-createdAt"); // Default: Newest first
  }

  // --- Pagination ---
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 50;
  const skip = (page - 1) * limit;

  query = query.skip(skip).limit(limit);

  // Execute Query
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
  // A) Get Company Data
  const company = await Company.findById(req.params.id).select(
    "-authId -verificationProgress -verificationStatus"
  ); // Exclude sensitive/internal data

  if (!company) {
    return next(new AppError("Company not found", 404));
  }

  // B) Get Company's Active Jobs
  // Note: Select fields relevant for the "Job Card" view
  const companyJobs = await Job.find({
    companyId: company._id,
    status: "published",
  }).select("title location type salaryMin salaryMax postedDate skills");

  res.status(200).json({
    status: "success",
    data: {
      company,
      openPositions: companyJobs, // Renamed to match common UI patterns
    },
  });
});
