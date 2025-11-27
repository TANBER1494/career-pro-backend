const Job = require("../models/Job");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

// 1. Get All Jobs (Public Feed)
exports.getAllJobs = catchAsync(async (req, res, next) => {
  // بنجيب كل الوظايف الـ Published بس
  // وبنعمل populate لبيانات الشركة (الاسم واللوجو والمكان)
  const jobs = await Job.find({ status: "published" })
    .sort("-createdAt")
    .populate({
      path: "companyId",
      select: "companyName logoUrl location",
    });

  res.status(200).json({
    status: "success",
    results: jobs.length,
    data: { jobs },
  });
});

// 2. Get Featured Jobs
exports.getFeaturedJobs = catchAsync(async (req, res, next) => {
  const jobs = await Job.find({ status: "published" }) // ممكن نزود شرط isFeatured: true لو ضفناه في السكيما
    .sort("-createdAt")
    .limit(6)
    .populate({
      path: "companyId",
      select: "companyName logoUrl",
    });

  res.status(200).json({
    status: "success",
    results: jobs.length,
    data: { jobs },
  });
});

// 3. Get Job Details
exports.getJob = catchAsync(async (req, res, next) => {
  const job = await Job.findById(req.params.id).populate({
    path: "companyId",
    select:
      "companyName description logoUrl website location industry companySize",
  });

  if (!job) {
    return next(new AppError("No job found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: { job },
  });
});
