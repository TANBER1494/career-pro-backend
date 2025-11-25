const JobApplication = require("../models/JobApplication");
const Job = require("../models/Job");
const JobSeeker = require("../models/JobSeeker");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

// 1. Apply for a Job
exports.applyForJob = catchAsync(async (req, res, next) => {
  const { jobId } = req.params;
  const { coverLetter } = req.body;

  if (!req.file) {
    return next(
      new AppError("Please upload your CV for this application.", 400)
    );
  }

  const job = await Job.findById(jobId);
  if (!job || job.status !== "published") {
    return next(
      new AppError("Job not found or no longer accepting applications.", 404)
    );
  }

  const seeker = await JobSeeker.findOne({ authId: req.user.id });
  if (!seeker) return next(new AppError("Complete your profile first!", 400));

  const existingApp = await JobApplication.findOne({
    jobId,
    seekerId: seeker._id,
  });
  if (existingApp) {
    return next(new AppError("You have already applied for this job.", 400));
  }

  const newApplication = await JobApplication.create({
    jobId,
    seekerId: seeker._id,
    coverLetter,
    resumeUrl: req.file.path,
    status: "submitted",
  });

  res.status(201).json({
    status: "success",
    message: "Application submitted successfully.",
    data: { application: newApplication },
  });
});

// 2. Toggle Save Job (Bookmark)
exports.toggleSaveJob = catchAsync(async (req, res, next) => {
  const { jobId } = req.params;

  const job = await Job.findById(jobId);
  if (!job) return next(new AppError("Job not found", 404));

  const seeker = await JobSeeker.findOne({ authId: req.user.id });

  const isSaved = seeker.savedJobs.includes(jobId);

  if (isSaved) {
    // Remove
    seeker.savedJobs = seeker.savedJobs.filter((id) => id.toString() !== jobId);
  } else {
    // Add
    seeker.savedJobs.push(jobId);
  }

  await seeker.save();

  res.status(200).json({
    status: "success",
    message: isSaved
      ? "Job removed from saved list."
      : "Job saved successfully.",
    data: { isSaved: !isSaved },
  });
});
