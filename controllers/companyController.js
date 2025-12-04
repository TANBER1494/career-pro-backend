const Company = require("../models/Company");
const CompanyVerificationDocument = require("../models/CompanyVerificationDocument");
const Authentication = require("../models/Authentication"); // نحتاجه لتحديث خطوات التسجيل
const Job = require("../models/Job");
const JobApplication = require("../models/JobApplication");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

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
    companyName,
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
  // ✅ تصحيح: إضافة منطق تحديث الاسم
  if (companyName) updateData.companyName = companyName;

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

  // Registration Step Tracking Logic
  const isStep2Update =
    technologies || benefits || linkedin || twitter || facebook || instagram;

  if (isStep2Update) {
    await Authentication.findByIdAndUpdate(req.user.id, {
      registrationStep: 3,
    });
  } else {
    await Authentication.findByIdAndUpdate(req.user.id, {
      registrationStep: 2,
    });
  }

  // Dynamic Response Construction
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
        companyName: updatedCompany.companyName, // ✅ إرجاع الاسم الجديد للتأكيد
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
        companyName: company.companyName, // هذا هو الحقل الذي سيظهر كعنوان رئيسي
        location: company.location,
        industry: company.industry,
        foundedYear: company.foundedYear,
        companySize: company.companySize,
        phone: company.phone,
        website: company.website,
        companyDescription: company.companyDescription,
        logoUrl: company.logoUrl, // تأكدنا من إرسال اللوجو هنا
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
  // إزالة public وتوحيد الشرطات لضمان عمل الرابط في الفرونت
  let logoUrl = req.file.path.replace("public", "").replace(/\\/g, "/");

  // التأكد من أن المسار يبدأ بـ / (أو uploads مباشرة حسب إعدادات السيرفر الاستاتيك)
  // إذا كنت تخدم ملفات static من الروت، فغالباً تحتاج /uploads/...
  if (!logoUrl.startsWith("/") && !logoUrl.startsWith("http")) {
    logoUrl = "/" + logoUrl;
  }

  // 3. Update DB
  // نستخدم authId للبحث عن الشركة وتحديث اللوجو
  const updatedCompany = await Company.findOneAndUpdate(
    { authId: req.user.id },
    { logoUrl: logoUrl },
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

  // Optional: Delete previous pending documents
  await CompanyVerificationDocument.deleteMany({
    companyId: company._id,
    verificationStatus: { $in: ["pending", "rejected"] },
  });

  const newDoc = await CompanyVerificationDocument.create({
    companyId: company._id,
    documentType: "business_registration_certificate", // Default single type
    fileName: req.file.originalname,
    filePath: req.file.path.replace(/\\/g, "/"),
    fileType: req.file.mimetype.split("/")[1] || "pdf",
    fileSize: req.file.size,
    verificationStatus: "pending",
  });

  // Update company status
  company.verificationStatus = "in_progress";
  company.verificationProgress = 100;
  await company.save();

  // Update Auth Step
  await Authentication.findByIdAndUpdate(req.user.id, { registrationStep: 4 });

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

  const totalApplicationsCount = await JobApplication.countDocuments({
    jobId: { $in: await Job.find({ companyId: company._id }).distinct("_id") },
  });

  // 2. Get Recent Jobs (Limit 3)
  const recentJobs = await Job.find({ companyId: company._id })
    .sort({ createdAt: -1 })
    .limit(3)
    .select("title status postedDate views");

  res.status(200).json({
    status: "success",
    data: {
      companyName: company.companyName,
      verificationStatus: company.verificationStatus,
      stats: {
        activeJobs: activeJobsCount,
        currentlyRecruiting: activeJobsCount,
        totalApplications: totalApplicationsCount,
        pendingReviews: 0,
      },
      recentJobs,
    },
  });
});
