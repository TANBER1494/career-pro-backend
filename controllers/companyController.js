const Company = require("../models/Company");
const CompanyVerificationDocument = require("../models/CompanyVerificationDocument");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const Job = require("../models/Job");
const JobApplication = require("../models/JobApplication");

// --- Helper: Get Company Document from Auth ID ---
const getCurrentCompany = async (authId) => {
  const company = await Company.findOne({ authId });
  if (!company) {
    throw new AppError(
      "Company profile not found. Please complete your profile.",
      404
    );
  }
  return company;
};

// ============================================================
// Profile & Uploads Logic
// ============================================================

exports.updateCompanyProfile = catchAsync(async (req, res, next) => {
  const company = await getCurrentCompany(req.user.id);

  const {
    // Step 1 Fields
    numberOfEmployees,
    location,
    industry,
    foundedYear,
    phone,
    website,
    companyDescription,
    // Step 2 Fields
    technologies,
    benefits,
    linkedin,
    twitter,
    facebook,
    instagram,
  } = req.body;

  const updateData = {};

  // --- Mapping Step 1 ---
  if (location) updateData.location = location;
  if (industry) updateData.industry = industry;
  if (foundedYear) updateData.foundedYear = foundedYear;
  if (phone) updateData.phone = phone;
  if (website) updateData.website = website;
  if (companyDescription) updateData.companyDescription = companyDescription;
  if (numberOfEmployees) updateData.companySize = numberOfEmployees;

  // --- Mapping Step 2 ---
  if (technologies) updateData.technologies = technologies;
  if (benefits) updateData.benefits = benefits;

  // Social Media Nested Update
  if (linkedin) updateData["socialMedia.linkedin"] = linkedin;
  if (twitter) updateData["socialMedia.twitter"] = twitter;
  if (facebook) updateData["socialMedia.facebook"] = facebook;
  if (instagram) updateData["socialMedia.instagram"] = instagram;

  if (Object.keys(updateData).length === 0) {
    return next(new AppError("Invalid company data", 400));
  }

  const updatedCompany = await Company.findByIdAndUpdate(
    company._id,
    updateData,
    {
      new: true,
      runValidators: true,
    }
  );

  // Dynamic Response Construction based on Contract
  const isStep2Update =
    technologies || benefits || linkedin || twitter || facebook || instagram;

  let responsePayload = {};
  let message = "Company information updated successfully";

  if (isStep2Update) {
    message = "Company details updated successfully";
    responsePayload = {
      companyDetails: {
        technologies: updatedCompany.technologies,
        benefits: updatedCompany.benefits,
        socialMedia: updatedCompany.socialMedia,
      },
    };
  } else {
    responsePayload = {
      companyInfo: {
        location: updatedCompany.location,
        industry: updatedCompany.industry,
        foundedYear: updatedCompany.foundedYear,
        numberOfEmployees: updatedCompany.companySize,
        phone: updatedCompany.phone,
        website: updatedCompany.website,
        companyDescription: updatedCompany.companyDescription,
      },
    };
  }

  res.status(200).json({
    status: "success",
    message: message,
    data: responsePayload,
  });
});

exports.getCompanyProfile = catchAsync(async (req, res, next) => {
  const company = await getCurrentCompany(req.user.id);

  const latestDoc = await CompanyVerificationDocument.findOne({
    companyId: company._id,
  }).sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    data: {
      companyInfo: {
        location: company.location,
        industry: company.industry,
        foundedYear: company.foundedYear,
        companySize: company.companySize,
        phone: company.phone,
        website: company.website,
        companyDescription: company.companyDescription,
      },
      companyDetails: {
        technologies: company.technologies,
        benefits: company.benefits,
        socialMedia: company.socialMedia,
      },
      verification: {
        documentUrl: latestDoc ? latestDoc.filePath.replace(/\\/g, "/") : null,
        verificationStatus: company.verificationStatus,
      },
    },
  });
});

exports.uploadCompanyLogo = catchAsync(async (req, res, next) => {
  // 1. Validation
  if (!req.file) {
    return next(new AppError("Please upload a file", 400));
  }

  // 2. Path Formatting
  let logoUrl = req.file.path.replace("public", "").replace(/\\/g, "/");
  // Ensure it doesn't start with double slashes if public wasn't there
  if (!logoUrl.startsWith("/")) logoUrl = "/" + logoUrl; // Optional based on your static serve setup

  // 3. Update DB (FIXED HERE) ✅
  // Use findOneAndUpdate with authId OR get the company first
  const updatedCompany = await Company.findOneAndUpdate(
    { authId: req.user.id }, // Search by Auth ID
    { logoUrl: logoUrl }, // Correct field name (logoUrl not logo)
    { new: true, runValidators: true }
  );

  if (!updatedCompany) {
    return next(new AppError("Company profile not found", 404));
  }

  // 4. Response
  res.status(200).json({
    status: "success",
    message: "Company logo updated successfully.",
    data: {
      logoUrl: updatedCompany.logoUrl,
    },
  });
});

exports.uploadVerificationDoc = catchAsync(async (req, res, next) => {
  const company = await getCurrentCompany(req.user.id);

  if (!req.file) {
    return next(new AppError("Please upload the verification file", 400));
  }

  // Optional: Delete previous pending documents to ensure only one active file exists
  await CompanyVerificationDocument.deleteMany({
    companyId: company._id,
    verificationStatus: { $in: ["pending", "rejected"] },
  });

  const newDoc = await CompanyVerificationDocument.create({
    companyId: company._id,
    // We default to one type since it's now a single file requirement
    documentType: "business_registration_certificate",
    fileName: req.file.originalname,
    filePath: req.file.path.replace(/\\/g, "/"),
    fileType: req.file.mimetype.split("/")[1] || "pdf",
    fileSize: req.file.size,
    verificationStatus: "pending",
  });

  // Update company status to indicate review is in progress
  company.verificationStatus = "in_progress";
  // Since it's a single file, uploading it means 100% of "uploading" is done
  company.verificationProgress = 100;
  await company.save();

  res.status(200).json({
    status: "success",
    message: "Verification file uploaded successfully",
    data: {
      documentUrl: newDoc.filePath,
      fileName: newDoc.fileName,
      uploadedAt: newDoc.createdAt,
      verificationStatus: "pending",
    },
  });
});

exports.getCompanyStats = catchAsync(async (req, res, next) => {
  const company = await getCurrentCompany(req.user.id);

  // 1. Get Stats
  const activeJobsCount = await Job.countDocuments({
    companyId: company._id,
    status: "published",
    isActive: true,
  });
  // Note: This is a simplified query. Real recruiting count might differ based on logic.
  const totalApplicationsCount = await JobApplication.countDocuments({
    jobId: { $in: await Job.find({ companyId: company._id }).distinct("_id") },
  });

  // 2. Get Recent Jobs (Limit 3)
  const recentJobs = await Job.find({ companyId: company._id })
    .sort({ createdAt: -1 })
    .limit(3)
    .select("title status postedDate views"); // Add views to schema if needed

  // 3. Get Recent Applications (Limit 3)
  // This requires a complex join (Lookup), for now let's mock or keep it simple query
  // We need application -> job (to check company) -> seeker
  // For MVP/Sprint 1 performance, you might do this in a separate aggregation or optimized query later.

  res.status(200).json({
    status: "success",
    data: {
      companyName: company.companyName,
      verificationStatus: company.verificationStatus,
      stats: {
        activeJobs: activeJobsCount,
        currentlyRecruiting: activeJobsCount, // logic can be refined
        totalApplications: totalApplicationsCount,
        pendingReviews: 0, // Needs query on applications status
      },
      recentJobs,
      // recentApplications: [] // Populate this when applicationController is fully ready
    },
  });
});
