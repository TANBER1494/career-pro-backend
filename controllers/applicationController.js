const Company = require("../models/Company");
const Job = require("../models/Job");
const JobApplication = require("../models/JobApplication");
const SeekerSkill = require("../models/SeekerSkill");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

// Helper
const getCurrentCompany = async (authId) => {
  const company = await Company.findOne({ authId });
  if (!company) {
    throw new AppError("Company profile not found.", 404);
  }
  return company;
};

// ============================================================
// Applications Logic
// ============================================================

exports.getCompanyApplications = catchAsync(async (req, res, next) => {
  const company = await getCurrentCompany(req.user.id);

  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 10;
  const skip = (page - 1) * limit;

  const jobs = await Job.find({ companyId: company._id }).select("_id");
  const jobIds = jobs.map((job) => job._id);

  // Build Query
  let query = { jobId: { $in: jobIds } };

  // Optional: Filter by specific Job if requested
  if (req.query.jobId) {
    query.jobId = req.query.jobId;
  }

  const applicationsQuery = JobApplication.find(query)
    .sort({ appliedAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate({ path: "jobId", select: "title" })
    .populate({
      path: "seekerId",
      select: "fullName phone yearsOfExperience authId",
      populate: { path: "authId", select: "email" },
    });

  const applicationsRaw = await applicationsQuery;

  const applications = await Promise.all(
    applicationsRaw.map(async (app) => {
      let displayStatus = app.status;
      if (app.status === "submitted") displayStatus = "New";
      if (app.status === "under_review") displayStatus = "Reviewing";
      if (app.status === "interview_scheduled") displayStatus = "Interviewed"; // Fixed typo from UI logic
      if (app.status === "accepted") displayStatus = "Hired";
      if (app.status === "rejected") displayStatus = "Rejected";

      let skillsList = [];
      if (app.seekerId) {
        const seekerSkills = await SeekerSkill.find({
          seekerId: app.seekerId._id,
        }).populate("skillId");
        skillsList = seekerSkills.map((s) => s.skillId.name);
      }

      const email =
        app.seekerId && app.seekerId.authId ? app.seekerId.authId.email : "N/A";
      const experience = app.seekerId
        ? `${app.seekerId.yearsOfExperience} years`
        : "0 years";

      return {
        id: app._id,
        candidateName: app.seekerId
          ? app.seekerId.fullName
          : "Unknown Candidate",
        email: email,
        phone: app.seekerId ? app.seekerId.phone : "N/A",
        position: app.jobId ? app.jobId.title : "Unknown Position",
        appliedAt: app.appliedAt,
        status: displayStatus,
        experience: experience,
        skills: skillsList,
        cvUrl: app.resumeUrl,
        coverLetter: app.coverLetter || "No cover letter provided",
      };
    })
  );

  res.status(200).json({
    status: "success",
    results: applications.length,
    data: { applications },
  });
});

exports.updateApplicationStatus = catchAsync(async (req, res, next) => {
  const company = await getCurrentCompany(req.user.id);
  const { status } = req.body;

  let dbStatus = status;
  if (status === "Reviewing") dbStatus = "under_review";
  if (status === "Interviewed") dbStatus = "interview_scheduled";
  if (status === "Hired") dbStatus = "accepted";
  if (status === "Rejected") dbStatus = "rejected";

  // FIXED: Use req.params.id to match standard routing
  const application = await JobApplication.findById(req.params.id).populate(
    "jobId"
  );

  if (!application) {
    return next(new AppError("Application not found", 404));
  }

  // Security Check: Ensure company owns the job
  if (application.jobId.companyId.toString() !== company._id.toString()) {
    return next(
      new AppError("You are not authorized to manage this application", 403)
    );
  }

  application.status = dbStatus;
  await application.save();

  res.status(200).json({
    status: "success",
    message: `Application status updated to ${status}.`,
  });
});
