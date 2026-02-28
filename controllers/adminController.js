const Company = require('../models/Company');
const CompanyVerificationDocument = require('../models/CompanyVerificationDocument');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const JobSeeker = require('../models/JobSeeker');
const Job = require('../models/Job');
const Authentication = require('../models/Authentication');
const Application = require('../models/JobApplication');

// 1. Get All Verification Requests (Pending)
exports.getVerificationRequests = catchAsync(async (req, res, next) => {
  // Get documents with status 'pending' (or allow filtering via query)
  const status = req.query.status || 'pending';

  console.log(`🔎 Searching for documents with status: ${status}`);

  const requests = await CompanyVerificationDocument.find({
    verificationStatus: status,
  }).populate({
    path: 'companyId',
    select: 'companyName industry location', // Show company details
  });

  console.log(`📄 Found ${requests.length} documents.`);

  res.status(200).json({
    status: 'success',
    results: requests.length,
    data: {
      requests,
    },
  });
});

// 2. Verify or Reject a Company
exports.reviewCompanyVerification = catchAsync(async (req, res, next) => {
  const { documentId } = req.params;
  const { status, rejectionReason } = req.body;

  if (!['approved', 'rejected'].includes(status)) {
    return next(
      new AppError('Status must be either approved or rejected', 400)
    );
  }

  if (status === 'rejected' && !rejectionReason) {
    return next(new AppError('Please provide a rejection reason', 400));
  }

  const doc = await CompanyVerificationDocument.findById(documentId);
  if (!doc) {
    return next(new AppError('Verification document not found', 404));
  }

  // 1. Update Document Status
  doc.verificationStatus = status;
  doc.rejectionReason = status === 'rejected' ? rejectionReason : undefined;
  doc.reviewedBy = req.user.id;
  doc.reviewedAt = Date.now();
  await doc.save();

  // 2. Update Company Status
  // Ensure we wait for the update to complete
  const company = await Company.findById(doc.companyId);

  if (!company) {
    return next(new AppError('Associated company not found', 404));
  }

  if (status === 'approved') {
    company.isVerified = true;
    company.verificationStatus = 'verified';
  } else {
    company.isVerified = false;
    company.verificationStatus = 'rejected';
    // Optionally reset progress if rejected to force re-upload
    company.verificationProgress = 0;
  }

  await company.save();

  res.status(200).json({
    status: 'success',
    message: `Company verification ${status}.`,
    data: {
      document: doc,
      companyStatus: company.verificationStatus,
      isVerified: company.isVerified,
    },
  });
});

// ============================================================
// 3. Get Dashboard Stats (Overview)
// ============================================================
exports.getDashboardStats = catchAsync(async (req, res, next) => {
  const [seekersCount, companiesCount, jobsCount, pendingVerifications] =
    await Promise.all([
      JobSeeker.countDocuments(),
      Company.countDocuments(),
      Job.countDocuments(),
      CompanyVerificationDocument.countDocuments({
        verificationStatus: 'pending',
      }),
    ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats: {
        totalSeekers: seekersCount,
        totalCompanies: companiesCount,
        totalJobs: jobsCount,
        pendingVerifications: pendingVerifications,
      },
    },
  });
});

// ============================================================
// 4. Get Job Seekers (With Full Details)
// ============================================================
exports.getJobSeekers = catchAsync(async (req, res, next) => {
  const { search } = req.query;

  let query = JobSeeker.find().populate({
    path: "authId",
    select: "email isVerified createdAt", 
  });

  if (search) {
    query = query.find({
      $or: [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { fullName: { $regex: search, $options: "i" } } 
      ]
    });
  }

  const seekers = await query.sort("-createdAt");

  const cleanSeekers = seekers.filter(item => item.authId);

  res.status(200).json({
    status: "success",
    results: cleanSeekers.length,
    data: {
      users: cleanSeekers,
    },
  });
});

// ============================================================
// 5. Get Companies (With Verification Statuses)
// ============================================================
exports.getCompanies = catchAsync(async (req, res, next) => {
  const { search } = req.query;

  let query = Company.find().populate({
    path: "authId",
    select: "email isVerified createdAt",
  });

  if (search) {
    query = query.find({ companyName: { $regex: search, $options: "i" } });
  }

  const companies = await query.sort("-createdAt");
  const cleanCompanies = companies.filter(item => item.authId);

  res.status(200).json({
    status: "success",
    results: cleanCompanies.length,
    data: {
      users: cleanCompanies,
    },
  });
});

// ============================================================
// 6. Delete User (Updated to handle ID from different collections)
// ============================================================
exports.deleteUser = catchAsync(async (req, res, next) => {
  const { id } = req.params; 
  const { type } = req.query; 

  let authIdToDelete = id;

  if (type === 'job_seeker') {
      const seeker = await JobSeeker.findById(id);
      if (seeker) authIdToDelete = seeker.authId;
  } else if (type === 'company') {
      const company = await Company.findById(id);
      if (company) authIdToDelete = company.authId;
  }

  const user = await Authentication.findByIdAndDelete(authIdToDelete);

  if (!user) {
    return next(new AppError("No user found with that ID", 404));
  }

  if (user.accountType === "job_seeker") {
    await JobSeeker.findOneAndDelete({ authId: user._id });
  } else if (user.accountType === "company") {
    const comp = await Company.findOneAndDelete({ authId: user._id });
    if (comp) await Job.deleteMany({ companyId: comp._id });
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});

// ============================================================
// 6. Get All Jobs (With Search)
// ============================================================
exports.getAllJobs = catchAsync(async (req, res, next) => {
  let filter = {};

  if (req.query.search) {
    filter.title = { $regex: req.query.search, $options: 'i' };
  }

  let query = Job.find(filter)
    .populate({
      path: 'companyId',
      select: 'companyName email logoUrl',
    })
    .sort('-createdAt');

  if (!req.query.search) {
    query = query.limit(100);
  }

  const jobs = await query;

  res.status(200).json({
    status: 'success',
    results: jobs.length,
    data: {
      jobs,
    },
  });
});
// ============================================================
// 6. Delete Job (Content Management)
// ============================================================
exports.deleteJob = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const job = await Job.findByIdAndDelete(id);

  if (!job) {
    return next(new AppError('No job found with that ID', 404));
  }

  await Application.deleteMany({ jobId: job._id });

  console.log(`🗑️ Admin deleted job: ${job.title} (${job._id})`);

  res.status(204).json({
    status: 'success',
    data: null,
  });
});


// ============================================================
// 7. Suspend User (Temporary 3-Day Ban)
// ============================================================
exports.suspendUser = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { reason } = req.body;

  if (!reason) {
    return next(new AppError('Please provide a reason for suspension', 400));
  }

  // 1. Calculate Suspension Expiry (3 Days from now)
  const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
  const suspensionExpires = new Date(Date.now() + threeDaysInMs);

  // 2. Find and Update the Authentication record
  const user = await Authentication.findByIdAndUpdate(
    id,
    {
      status: 'suspended',
      suspensionExpires: suspensionExpires,
      suspensionReason: reason,
    },
    { new: true, runValidators: true }
  );

  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }

  console.log(`⚠️ Admin suspended user: ${user.email} until ${suspensionExpires}`);

  res.status(200).json({
    status: 'success',
    message: `User account has been suspended until ${suspensionExpires.toLocaleString()}`,
    data: {
      user: {
        id: user._id,
        email: user.email,
        status: user.status,
        suspensionExpires: user.suspensionExpires,
      },
    },
  });
});