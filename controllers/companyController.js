const Company = require("../models/Company");
const CompanyVerificationDocument = require("../models/CompanyVerificationDocument");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

// --- Helper: Get Company Document from Auth ID ---
const getCurrentCompany = async (authId) => {
  const company = await Company.findOne({ authId });
  if (!company) {
    throw new AppError("Company profile not found. Please complete your profile.", 404);
  }
  return company;
};

// ============================================================
// Profile & Uploads Logic
// ============================================================

exports.updateCompanyProfile = catchAsync(async (req, res, next) => {
  const company = await getCurrentCompany(req.user.id);

  // استلام كل البيانات المحتملة (Step 1 + Step 2)
  const { 
    // Step 1 Fields
    numberOfEmployees, location, industry, foundedYear, phone, website, companyDescription,
    // Step 2 Fields
    technologies, benefits, linkedin, twitter, facebook, instagram
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
  
  // تحديث السوشيال ميديا (Nested Fields Update)
  // بنستخدم Dot Notation عشان نحدث حقول محددة جوه الـ Object من غير ما نمسح الباقي
  if (linkedin) updateData['socialMedia.linkedin'] = linkedin;
  if (twitter) updateData['socialMedia.twitter'] = twitter;
  if (facebook) updateData['socialMedia.facebook'] = facebook;
  if (instagram) updateData['socialMedia.instagram'] = instagram;

  // 2. Validation: لو مفيش أي داتا اتبعتت
  if (Object.keys(updateData).length === 0) {
    return next(new AppError("Invalid company data", 400));
  }

  // 3. التحديث في الداتا بيز
  const updatedCompany = await Company.findByIdAndUpdate(company._id, updateData, {
    new: true,
    runValidators: true
  });

  // 4. تشكيل الرد (Dynamic Response)
  // بنشوف هل التحديث كان يخص Step 2 (سوشيال أو مهارات) ولا Step 1
  // عشان نرجع شكل الـ JSON المناسب للـ Contract
  const isStep2Update = technologies || benefits || linkedin || twitter || facebook || instagram;
  
  let responsePayload = {};
  let message = "Company information updated successfully";

  if (isStep2Update) {
      // شكل الرد الخاص بـ Step 2
      message = "Company details updated successfully";
      responsePayload = {
          companyDetails: {
              technologies: updatedCompany.technologies,
              benefits: updatedCompany.benefits,
              socialMedia: updatedCompany.socialMedia
          }
      };
  } else {
      // شكل الرد الخاص بـ Step 1
      responsePayload = {
          companyInfo: {
              location: updatedCompany.location,
              industry: updatedCompany.industry,
              foundedYear: updatedCompany.foundedYear,
              numberOfEmployees: updatedCompany.companySize,
              phone: updatedCompany.phone,
              website: updatedCompany.website,
              companyDescription: updatedCompany.companyDescription
          }
      };
  }

  res.status(200).json({
    status: 'success',
    message: message,
    data: responsePayload
  });
});
exports.getCompanyProfile = catchAsync(async (req, res, next) => {
  const company = await getCurrentCompany(req.user.id);

  // بنجيب آخر مستند توثيق تم رفعه (عشان نعرض الرابط بتاعه)
  const latestDoc = await CompanyVerificationDocument.findOne({ companyId: company._id })
    .sort({ createdAt: -1 }); // الأحدث أولاً

  res.status(200).json({
    status: "success",
    data: {
      // الجزء الأول: معلومات أساسية (Step 1)
      companyInfo: {
        location: company.location,
        industry: company.industry,
        foundedYear: company.foundedYear,
        companySize: company.companySize,
        phone: company.phone,
        website: company.website,
        companyDescription: company.companyDescription
      },
      
      // الجزء الثاني: تفاصيل إضافية (Step 2)
      companyDetails: {
        technologies: company.technologies,
        benefits: company.benefits,
        socialMedia: company.socialMedia
      },

      // الجزء الثالث: التوثيق (Step 3)
      verification: {
        documentUrl: latestDoc ? latestDoc.filePath.replace(/\\/g, "/") : null,
        verificationStatus: company.verificationStatus
      }
    }
  });
});

exports.uploadCompanyLogo = catchAsync(async (req, res, next) => {
  const company = await getCurrentCompany(req.user.id);
  
  if (!req.file) {
    return next(new AppError("Please upload an image file", 400));
  }

  company.logoUrl = req.file.path; 
  await company.save();

  res.status(200).json({
    status: "success",
    message: "Company logo updated successfully.",
    data: { logoUrl: company.logoUrl }
  });
});

exports.uploadVerificationDoc = catchAsync(async (req, res, next) => {
  const company = await getCurrentCompany(req.user.id);

  if (!req.file) {
      return next(new AppError("Please upload a document", 400));
  }
  
  // إنشاء السجل في الداتا بيز
  const newDoc = await CompanyVerificationDocument.create({
      companyId: company._id,
      documentType: req.body.documentType || 'tax_certificate', 
      fileName: req.file.originalname,
      filePath: req.file.path.replace(/\\/g, "/"), // (اختياري) عشان المسار يطلع Forward Slash زي الويب
      fileType: req.file.mimetype.split('/')[1] || 'pdf',
      fileSize: req.file.size
  });

  // تحديث حالة الشركة
  company.verificationStatus = 'in_progress';
  await company.save();

  // إرسال الرد بنفس الشكل المطلوب بالظبط
  res.status(200).json({
      status: "success",
      message: "Verification document uploaded successfully",
      data: { 
          documentUrl: newDoc.filePath.replace(/\\/g, "/"), // تعديل شكل المسار
          fileName: newDoc.fileName,
          uploadedAt: newDoc.uploadedAt, // استخدمنا uploadedAt بدل createdAt بناءً على الموديل
          verificationStatus: "pending" // أو newDoc.verificationStatus
      }
  });
});