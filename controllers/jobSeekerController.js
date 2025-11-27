const JobSeeker = require("../models/JobSeeker");
const CvUpload = require("../models/CvUpload");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

// 1. Update Personal Info (Step 1)
exports.updateProfileStep1 = catchAsync(async (req, res, next) => {
  const {
    phoneNumber,
    birthDate,
    gender,
    yearsOfExperience,
    industry,
    country,
    city,
    location,
  } = req.body;

  const updateData = {
    phone: phoneNumber,
    birthDate,
    gender,
    yearsOfExperience,
    industry,
    location: location || (city && country ? `${city}, ${country}` : undefined),
  };

  // Remove undefined fields
  Object.keys(updateData).forEach(
    (key) => updateData[key] === undefined && delete updateData[key]
  );

  const updatedSeeker = await JobSeeker.findOneAndUpdate(
    { authId: req.user.id },
    updateData,
    { new: true, runValidators: true, upsert: true }
  );

  res.status(200).json({
    status: "success",
    message: "Personal information updated successfully",
    data: { profile: updatedSeeker },
  });
});

// 2. Update Education & Preferences (Step 2)
exports.updateProfileStep2 = catchAsync(async (req, res, next) => {
  const { degree, university, graduationYear, jobType, workplaceSetting } =
    req.body;

  const updateData = {
    degree,
    university,
    graduationYear,
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

  res.status(200).json({
    status: "success",
    message: "Education and preferences updated successfully",
    data: { education: updatedSeeker },
  });
});

// 3. Upload CV (Step 3)
exports.uploadCV = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(
      new AppError("No CV file uploaded. Please upload a PDF or DOCX.", 400)
    );
  }

  // Find seeker ID
  const seeker = await JobSeeker.findOne({ authId: req.user.id });
  if (!seeker) return next(new AppError("Job Seeker profile not found", 404));

  // Create Record
  const newCv = await CvUpload.create({
    seekerId: seeker._id,
    fileName: req.file.originalname,
    filePath: req.file.path,
    fileType: req.file.mimetype.split("/")[1] || "pdf",
    fileSize: req.file.size,
    uploadStatus: "uploaded",
  });

  res.status(201).json({
    status: "success",
    message: "CV uploaded successfully",
    data: {
      cvUrl: req.file.path,
      fileName: req.file.originalname,
      uploadedAt: newCv.createdAt,
    },
  });
});

// 4. Get My Profile
exports.getMe = catchAsync(async (req, res, next) => {
  const seeker = await JobSeeker.findOne({ authId: req.user.id }).populate({
    path: "authId",
    select: "email accountType isVerified",
  });

  if (!seeker) {
    return next(new AppError("Profile not found", 404));
  }

  // Get latest CV
  const latestCv = await CvUpload.findOne({ seekerId: seeker._id }).sort({
    createdAt: -1,
  });

  res.status(200).json({
    status: "success",
    data: {
      profile: seeker,
      account: seeker.authId,
      cv: latestCv
        ? {
            url: latestCv.filePath,
            fileName: latestCv.fileName,
            uploadedAt: latestCv.createdAt,
          }
        : null,
    },
  });
});
