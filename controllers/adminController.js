const Company = require("../models/Company");
const CompanyVerificationDocument = require("../models/CompanyVerificationDocument");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

// 1. Get All Verification Requests (Pending)
exports.getVerificationRequests = catchAsync(async (req, res, next) => {
  // Get documents with status 'pending' (or allow filtering via query)
  const status = req.query.status || "pending";

  // --- أضف هذا السطر للطباعة في التيرمينال ---
  console.log(`🔎 Searching for documents with status: ${status}`);

  const requests = await CompanyVerificationDocument.find({
    verificationStatus: status,
  }).populate({
    path: "companyId",
    select: "companyName industry location", // Show company details
  });

  // --- أضف هذا السطر أيضاً ---
  console.log(`📄 Found ${requests.length} documents.`);

  res.status(200).json({
    status: "success",
    results: requests.length,
    data: {
      requests,
    },
  });
});

// 2. Verify or Reject a Company
exports.reviewCompanyVerification = catchAsync(async (req, res, next) => {
  const { documentId } = req.params;
  const { status, rejectionReason } = req.body; // status should be 'approved' or 'rejected'

  // A. Validate Input
  if (!["approved", "rejected"].includes(status)) {
    return next(
      new AppError("Status must be either approved or rejected", 400)
    );
  }

  if (status === "rejected" && !rejectionReason) {
    return next(new AppError("Please provide a rejection reason", 400));
  }

  // B. Find the Document
  const doc = await CompanyVerificationDocument.findById(documentId);
  if (!doc) {
    return next(new AppError("Verification document not found", 404));
  }

  // C. Update Document Status
  doc.verificationStatus = status;
  doc.rejectionReason = status === "rejected" ? rejectionReason : undefined;
  doc.reviewedBy = req.user.id; // Admin ID from protect middleware
  doc.reviewedAt = Date.now();
  await doc.save();

  // D. Update Company Status (The most important part)
  const company = await Company.findById(doc.companyId);

  if (status === "approved") {
    company.isVerified = true;
    company.verificationStatus = "verified";
    company.verificationProgress = 100;
  } else {
    company.isVerified = false;
    company.verificationStatus = "rejected";
    // Progress remains same or resets, depends on logic. Let's keep it same.
  }
  await company.save();

  res.status(200).json({
    status: "success",
    message: `Company verification ${status}.`,
    data: {
      document: doc,
      companyStatus: company.verificationStatus,
    },
  });
});
