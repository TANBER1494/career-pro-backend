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
// 4. Get All Users (For Admin Panel)
// ============================================================

exports.getAllUsers = catchAsync(async (req, res, next) => {
  let filter = { accountType: { $ne: 'admin' } };

  if (req.query.search) {
    filter.email = { $regex: req.query.search, $options: 'i' }; // 'i' تعني غير حساس لحالة الأحرف
  }

  const users = await Authentication.find(filter)
    .select('-password')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: users.length,
    data: {
      users,
    },
  });
});

// ============================================================
// 5. Delete User (Ban/Remove)
// ============================================================
exports.deleteUser = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const user = await Authentication.findByIdAndDelete(id);

  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }

  if (user.accountType === 'job_seeker') {
    await JobSeeker.findOneAndDelete({ authId: user._id });
  } else if (user.accountType === 'company') {
    const company = await Company.findOneAndDelete({ authId: user._id });
    if (company) {
      await Job.deleteMany({ companyId: company._id });
    }
  }

  res.status(204).json({
    status: 'success',
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
