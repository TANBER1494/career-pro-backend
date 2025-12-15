const JobSeeker = require("../models/JobSeeker");
const CvUpload = require("../models/CvUpload");
const Authentication = require("../models/Authentication");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const Job = require("../models/Job");
const Application = require("../models/JobApplication");
// ============================================================
// 1. Update Personal Info (Step 1)
// ============================================================
exports.updateProfileStep1 = catchAsync(async (req, res, next) => {
  const {
    fullName,
    jobTitle,
    summary,
    phoneNumber,
    birthDate,
    gender,
    yearsOfExperience,
    experienceLevel,
    industry,
    country,
    city,
    linkedin,
    personalWebsite,
  } = req.body;

  // تجهيز البيانات لتطابق الموديل
  const updateData = {
    fullName,
    jobTitle,
    summary,
    phone: phoneNumber,
    birthDate,
    gender,
    yearsOfExperience,
    experienceLevel,
    industry,
    country,
    city,
    // نقوم بتحديث location أيضاً كحقل مدمج
    location: city && country ? `${city}, ${country}` : undefined,
    linkedin,
    personalWebsite,
  };

  // حذف الحقول غير المعرفة (undefined) لتجنب مسح البيانات الموجودة
  Object.keys(updateData).forEach(
    (key) => updateData[key] === undefined && delete updateData[key]
  );

  const updatedSeeker = await JobSeeker.findOneAndUpdate(
    { authId: req.user.id },
    updateData,
    { new: true, runValidators: true, upsert: true }
  );

  // تحديث خطوة التسجيل
  await Authentication.findByIdAndUpdate(req.user.id, { registrationStep: 2 });

  res.status(200).json({
    status: "success",
    message: "Personal information updated successfully",
    data: { profile: updatedSeeker },
  });
});

// ============================================================
// 2. Update Education & Preferences (Step 2)
// ============================================================
exports.updateProfileStep2 = catchAsync(async (req, res, next) => {
  const { degree, university, graduationYear, gpa, jobType, workplaceSetting } =
    req.body;

  const updateData = {
    degree,
    university,
    graduationYear,
    gpa,
    // ربط الحقول بأسماء الموديل
    workType: jobType,
    workPlace: workplaceSetting,
  };

  Object.keys(updateData).forEach(
    (key) => updateData[key] === undefined && delete updateData[key]
  );

  const updatedSeeker = await JobSeeker.findOneAndUpdate(
    { authId: req.user.id },
    updateData,
    { new: true, runValidators: true }
  );

  if (!updatedSeeker) {
    return next(new AppError("Please complete Step 1 first", 404));
  }

  await Authentication.findByIdAndUpdate(req.user.id, { registrationStep: 3 });

  res.status(200).json({
    status: "success",
    message: "Education updated successfully",
    data: { education: updatedSeeker },
  });
});

// ============================================================
// 3. Upload CV (Step 3)
// ============================================================
exports.uploadCV = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(
      new AppError("No CV file uploaded. Please upload a PDF or DOCX.", 400)
    );
  }

  const seeker = await JobSeeker.findOne({ authId: req.user.id });
  if (!seeker) return next(new AppError("Job Seeker profile not found", 404));

  const newCv = await CvUpload.create({
    seekerId: seeker._id,
    fileName: req.file.originalname,
    filePath: req.file.path.replace(/\\/g, "/"), // إصلاح المسار للويندوز
    fileType: req.file.mimetype.split("/")[1] || "pdf",
    fileSize: req.file.size,
    uploadStatus: "uploaded",
  });

  await Authentication.findByIdAndUpdate(req.user.id, { registrationStep: 4 });

  res.status(201).json({
    status: "success",
    message: "CV uploaded successfully",
    data: {
      cvUrl: newCv.filePath,
      fileName: newCv.fileName,
      uploadedAt: newCv.createdAt,
    },
  });
});

// 4. Get Complete Profile (Corrected to fetch Name from Auth)
exports.getMe = catchAsync(async (req, res, next) => {
  // ✅ التعديل هنا: أضفنا firstName و lastName في الـ populate
  const seeker = await JobSeeker.findOne({ authId: req.user.id }).populate(
    "authId",
    "email firstName lastName"
  );

  if (!seeker) {
    return res.status(200).json({
      status: "success",
      data: { profile: {} },
    });
  }

  const latestCv = await CvUpload.findOne({ seekerId: seeker._id }).sort({
    createdAt: -1,
  });

  // منطق تحديد الاسم:
  // 1. نستخدم الاسم المسجل في بروفايل الوظيفة (إذا عدله المستخدم)
  // 2. إذا لم يوجد، نستخدم الاسم المسجل في حساب الدخول (Auth)
  const authName = seeker.authId
    ? `${seeker.authId.firstName} ${seeker.authId.lastName}`
    : "";
  const finalName = seeker.fullName || authName;

  const responseData = {
    personal: {
      fullName: finalName, // ✅ الاسم سيظهر الآن
      firstName: seeker.authId?.firstName, // نرسلهم منفصلين أيضاً للاحتياط
      lastName: seeker.authId?.lastName,
      jobTitle: seeker.jobTitle,
      summary: seeker.summary,
      email: seeker.authId?.email,
      phoneNumber: seeker.phone,
      birthDate: seeker.birthDate,
      gender: seeker.gender,
      country: seeker.country,
      city: seeker.city,
      location: seeker.location,
      yearsOfExperience: seeker.yearsOfExperience,
      experienceLevel: seeker.experienceLevel,
      industry: seeker.industry,
      linkedin: seeker.linkedin,
      personalWebsite: seeker.personalWebsite,
    },
    education: {
      degree: seeker.degree,
      university: seeker.university,
      graduationYear: seeker.graduationYear,
      gpa: seeker.gpa,
      jobType: seeker.workType,
      workplaceSetting: seeker.workPlace,
    },
    cv: latestCv
      ? {
          cvUrl: latestCv.filePath.replace(/\\/g, "/"),
          fileName: latestCv.fileName,
        }
      : null,
  };

  res.status(200).json({
    status: "success",
    data: responseData,
  });
});

// ============================================================
// 5. Toggle Save Job
// ============================================================
exports.toggleSaveJob = catchAsync(async (req, res, next) => {
  const jobId = req.params.id;
  const seeker = await JobSeeker.findOne({ authId: req.user.id });

  if (!seeker) return next(new AppError("Profile not found.", 404));

  const isJobSaved = seeker.savedJobs.some((id) => id.toString() === jobId);
  let message = "";

  if (isJobSaved) {
    seeker.savedJobs = seeker.savedJobs.filter((id) => id.toString() !== jobId);
    message = "Job removed from saved list.";
  } else {
    seeker.savedJobs.push(jobId);
    message = "Job saved successfully.";
  }

  await seeker.save({ validateBeforeSave: false });

  res.status(200).json({
    status: "success",
    message,
    data: { isSaved: !isJobSaved },
  });
});

exports.getSavedJobs = catchAsync(async (req, res, next) => {
  const seeker = await JobSeeker.findOne({ authId: req.user.id });

  if (!seeker) {
    return next(new AppError("User not found", 404));
  }

  // 2. نبحث في جدول الوظائف عن كل وظيفة الـ ID الخاص بها موجود في مصفوفة savedJobs
  const jobs = await Job.find({
    _id: { $in: seeker.savedJobs },
  }).populate({
    path: "companyId", // عشان نجيب اسم الشركة واللوجو
    select: "companyName logoUrl location",
  });

  // 3. إرسال الرد
  res.status(200).json({
    status: "success",
    results: jobs.length,
    data: {
      jobs: jobs, // الفرونت مستني data.jobs
    },
  });
});

// ============================================================
// Delete Application
// ============================================================
exports.deleteApplication = catchAsync(async (req, res, next) => {
  const { appId } = req.params;

  const seeker = await JobSeeker.findOne({ authId: req.user.id });

  if (!seeker) {
    return next(new AppError("Job Seeker profile not found.", 404));
  }

  const application = await Application.findOneAndDelete({
    _id: appId,
    seekerId: seeker._id,
  });

  if (!application) {
    return next(
      new AppError(
        "Application not found or you are not authorized to delete it.",
        404
      )
    );
  }

  // 3. الرد بنجاح
  res.status(204).json({
    status: "success",
    data: null,
  });
});
