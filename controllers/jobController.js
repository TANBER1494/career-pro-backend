const Company = require("../models/Company");
const Job = require("../models/Job");
const JobApplication = require("../models/JobApplication");
const CompanyVerificationDocument = require("../models/CompanyVerificationDocument"); // محتاجينه للـ Stats
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

const getCurrentCompany = async (authId) => {
  const company = await Company.findOne({ authId });
  if (!company) {
    throw new AppError("Company profile not found.", 404);
  }
  return company;
};

// ============================================================
// Jobs Logic / protected / Company
// ============================================================

exports.getCompanyStats = catchAsync(async (req, res, next) => {
  const company = await getCurrentCompany(req.user.id);

  const jobs = await Job.find({ companyId: company._id }).select("_id");
  const jobIds = jobs.map((job) => job._id);

  const uploadedDocsCount = await CompanyVerificationDocument.countDocuments({
    companyId: company._id,
  });
  const totalRequiredDocs = 3;

  const activeJobsCount = await Job.countDocuments({
    companyId: company._id,
    status: "published",
  });
  const totalAppsCount = await JobApplication.countDocuments({
    jobId: { $in: jobIds },
  });

  const pendingReviewsCount = await JobApplication.countDocuments({
    jobId: { $in: jobIds },
    status: { $in: ["submitted", "under_review"] },
  });

  const recentJobsRaw = await Job.find({ companyId: company._id })
    .sort({ createdAt: -1 })
    .limit(3)
    .lean();

  const recentJobs = await Promise.all(
    recentJobsRaw.map(async (job) => {
      const appCount = await JobApplication.countDocuments({ jobId: job._id });

      let displayStatus = job.status;
      if (job.status === "published") displayStatus = "Active";
      if (job.status === "draft") displayStatus = "Draft";
      if (job.status === "closed") displayStatus = "Closed";

      return {
        id: job._id,
        title: job.title,
        status: displayStatus,
        applicationsCount: appCount,
        viewsCount: 0,
        postedAt: job.createdAt,
      };
    })
  );

  const recentAppsRaw = await JobApplication.find({ jobId: { $in: jobIds } })
    .sort({ appliedAt: -1 })
    .limit(3)
    .populate({ path: "seekerId", select: "fullName" })
    .populate({ path: "jobId", select: "title" })
    .lean();

  const recentApplications = recentAppsRaw.map((app) => {
    let displayStatus = app.status;
    if (app.status === "submitted") displayStatus = "New";
    if (app.status === "under_review") displayStatus = "Reviewing";
    if (app.status === "interview_scheduled") displayStatus = "Interview";

    return {
      id: app._id,
      candidateName: app.seekerId ? app.seekerId.fullName : "Unknown User",
      position: app.jobId ? app.jobId.title : "Unknown Job",
      status: displayStatus,
      appliedAt: app.appliedAt,
    };
  });

  res.status(200).json({
    status: "success",
    data: {
      companyName: company.companyName,
      verificationStatus: company.verificationStatus,
      verificationProgress: {
        uploadedDocuments: uploadedDocsCount,
        totalDocuments: totalRequiredDocs,
      },
      stats: {
        activeJobs: activeJobsCount,
        currentlyRecruiting: activeJobsCount,
        totalApplications: totalAppsCount,
        pendingReviews: pendingReviewsCount,
      },
      recentJobs: recentJobs,
      recentApplications: recentApplications,
    },
  });
});

exports.createNewJob = catchAsync(async (req, res, next) => {
  const company = await getCurrentCompany(req.user.id);

  const { title, description, location, type } = req.body;

  if (!title || !description || !location || !type) {
    return next(
      new AppError(
        "Please provide all required fields: title, description, location, type.",
        400
      )
    );
  }

  let jobData = { ...req.body, companyId: company._id };

  if (typeof jobData.skills === "string") {
    jobData.skills = jobData.skills.split(",").map((s) => s.trim());
  }

  const newJob = await Job.create(jobData);

  let displayStatus = newJob.status;
  if (displayStatus === "published") displayStatus = "Active";

  res.status(201).json({
    status: "success",
    message: "Job posted successfully.",
    data: {
      job: {
        id: newJob._id,
        title: newJob.title,
        status: displayStatus,
        createdAt: newJob.createdAt,
      },
    },
  });
});

exports.getCompanyJobs = catchAsync(async (req, res, next) => {
  const company = await getCurrentCompany(req.user.id);

  const queryObj = { companyId: company._id };

  if (req.query.keyword)
    queryObj.title = { $regex: req.query.keyword, $options: "i" };
  if (req.query.status) queryObj.status = req.query.status;

  const jobs = await Job.find(queryObj).sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    results: jobs.length,
    data: { jobs },
  });
});

exports.editJobDetails = catchAsync(async (req, res, next) => {
  const company = await getCurrentCompany(req.user.id);

  let updateData = { ...req.body };

  if (updateData.status === "Active") updateData.status = "published";
  if (updateData.status === "Draft") updateData.status = "draft";
  if (updateData.status === "Closed") updateData.status = "closed";

  const job = await Job.findOneAndUpdate(
    { _id: req.params.id, companyId: company._id },
    updateData,
    { new: true, runValidators: true }
  );

  if (!job) {
    return next(new AppError("Job not found or unauthorized", 404));
  }

  let displayStatus = job.status;
  if (job.status === "published") displayStatus = "Active";
  if (job.status === "draft") displayStatus = "Draft";
  if (job.status === "closed") displayStatus = "Closed";

  res.status(200).json({
    status: "success",
    message: "Job updated successfully.",
    data: {
      job: {
        id: job._id,
        title: job.title,
        salaryMax: job.salaryMax,
        status: displayStatus,
        updatedAt: job.updatedAt,
      },
    },
  });
});

exports.updateJobStatus = catchAsync(async (req, res, next) => {
  const company = await getCurrentCompany(req.user.id);
  const { status } = req.body;

  let dbStatus = status;
  if (status === "Active") dbStatus = "published";
  if (status === "Draft") dbStatus = "draft";
  if (status === "Closed") dbStatus = "closed";
  if (status === "Archived") dbStatus = "archived";
  if (status === "Paused") dbStatus = "closed";

  const job = await Job.findOneAndUpdate(
    { _id: req.params.id, companyId: company._id },
    { status: dbStatus },
    { new: true, runValidators: true }
  );

  if (!job) {
    return next(new AppError("Job not found or unauthorized", 404));
  }

  res.status(200).json({
    status: "success",
    message: "Job status updated.",
  });
});

exports.deleteJob = catchAsync(async (req, res, next) => {
  const company = await getCurrentCompany(req.user.id);

  const job = await Job.findOneAndDelete({
    _id: req.params.id,
    companyId: company._id,
  });

  if (!job) {
    return next(new AppError("Job not found or unauthorized", 404));
  }

  await JobApplication.deleteMany({ jobId: req.params.id });

  res.status(204).json({
    status: "success",
    data: null,
  });
});

// ============================================================
// Public / Seeker Logic
// ============================================================

// 1. Get Featured Jobs (Random 6 jobs for Home Page)
exports.getFeaturedJobs = catchAsync(async (req, res, next) => {
  // Using Aggregation Pipeline to get random documents efficiently
  const jobs = await Job.aggregate([
    // 1. Filter only published jobs
    { $match: { status: "published" } },

    // 2. Select 6 random documents
    { $sample: { size: 6 } },
  ]);

  // 3. Populate Company Info (Since aggregation returns plain objects)
  await Job.populate(jobs, {
    path: "companyId",
    select: "companyName location logoUrl",
  });

  res.status(200).json({
    status: "success",
    results: jobs.length,
    data: {
      jobs,
    },
  });
});

// 2. Get All Jobs (Public Search & Filter)
exports.getAllJobs = catchAsync(async (req, res, next) => {
  // A. Filtering Logic
  const queryObj = { ...req.query };
  const excludedFields = [
    "page",
    "sort",
    "limit",
    "fields",
    "search",
    "keyword",
  ];
  excludedFields.forEach((el) => delete queryObj[el]);

  // Force: Only show published/active jobs to public
  queryObj.status = "published";

  // B. Search Logic (Title or Description)
  if (req.query.search) {
    const searchQuery = req.query.search;
    // Using Regex for simple search (Case insensitive)
    queryObj.$or = [
      { title: { $regex: searchQuery, $options: "i" } },
      { description: { $regex: searchQuery, $options: "i" } },
    ];
  }
  // Handle specific filters mapping if needed (e.g., location, type are auto-handled by queryObj)

  // C. Build Query
  let query = Job.find(queryObj).populate({
    path: "companyId",
    select: "companyName location logoUrl isVerified",
  });

  // D. Sorting
  if (req.query.sort) {
    const sortBy = req.query.sort.split(",").join(" ");
    query = query.sort(sortBy);
  } else {
    query = query.sort("-createdAt"); // Default: Newest first
  }

  // E. Pagination
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 50;
  const skip = (page - 1) * limit;

  query = query.skip(skip).limit(limit);

  // F. Execute
  const jobs = await query;

  // G. Check "isSaved" status (Optional - if user is logged in)
  // This part requires more logic (checking User's saved jobs list),
  // For now, we return the jobs. We can add 'isSaved' decoration later in Phase 3.

  res.status(200).json({
    status: "success",
    results: jobs.length,
    data: {
      jobs,
    },
  });
});

// 3. Get Single Job Details (Public)
exports.getJobDetails = catchAsync(async (req, res, next) => {
  const job = await Job.findById(req.params.id).populate({
    path: "companyId",
    select: "companyName location logoUrl description website isVerified",
  });

  if (!job) {
    return next(new AppError("Job not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      job,
    },
  });
});

// exports.getCompanyJobs
exports.getCompanyJobs = catchAsync(async (req, res, next) => {
  // 1. Get Current Company
  const company = await getCurrentCompany(req.user.id);

  // 2. Build Query (Filter by Company ID)
  const queryObj = { companyId: company._id };

  // Optional: Filter by status (Active, Closed, etc.)
  if (req.query.status && req.query.status !== "all") {
    queryObj.status = req.query.status;
  }

  // 3. Execute Query
  const jobs = await Job.find(queryObj).sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    results: jobs.length,
    data: {
      jobs,
    },
  });
});
