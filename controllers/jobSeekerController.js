const JobSeeker = require("../models/JobSeeker");
const CvUpload = require("../models/CvUpload");
const Authentication = require("../models/Authentication");
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

  await Authentication.findByIdAndUpdate(req.user.id, { registrationStep: 2 });

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
  await Authentication.findByIdAndUpdate(req.user.id, { registrationStep: 3 });

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

  await Authentication.findByIdAndUpdate(req.user.id, { registrationStep: 4 });

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

// 4. Get Complete Profile (For Dashboard/Profile Page)
exports.getMe = catchAsync(async (req, res, next) => {
  // 1. Find Job Seeker Profile linked to the logged-in user
  const seeker = await JobSeeker.findOne({ authId: req.user.id }).populate({
    path: "authId",
    select: "email isVerified accountType", // Get email from Auth table
  });

  if (!seeker) {
    return next(
      new AppError("Profile not found. Please contact support.", 404)
    );
  }

  // 2. Get the Latest Uploaded CV (if exists)
  const latestCv = await CvUpload.findOne({ seekerId: seeker._id })
    .sort({ createdAt: -1 }) // Get the newest one
    .select("filePath fileName createdAt");

  // 3. Format the Response (Matching the API Contract Structure)
  // We group data into logical sections: Personal, Education, CV
  const responseData = {
    personal: {
      fullName: seeker.fullName,
      email: seeker.authId.email, // From populated Auth
      phoneNumber: seeker.phone,
      birthDate: seeker.birthDate,
      gender: seeker.gender,
      location: seeker.location,
      yearsOfExperience: seeker.yearsOfExperience,
      industry: seeker.industry,
      about: seeker.about, // If you added 'about' or 'bio' field
    },
    education: {
      degree: seeker.degree,
      university: seeker.university,
      graduationYear: seeker.graduationYear,
      // Preferences are often displayed with education/career info
      workType: seeker.workType,
      workPlace: seeker.workPlace,
    },
    cv: latestCv
      ? {
          cvUrl: latestCv.filePath.replace(/\\/g, "/"), // Ensure forward slashes for URLs
          fileName: latestCv.fileName,
          uploadedAt: latestCv.createdAt,
        }
      : null,
  };

  res.status(200).json({
    status: "success",
    data: responseData,
  });
});

// 5. Toggle Save Job (Add/Remove from favorites)
exports.toggleSaveJob = catchAsync(async (req, res, next) => {
  const jobId = req.params.id;

  // 1. Get Seeker Profile
  const seeker = await JobSeeker.findOne({ authId: req.user.id });
  if (!seeker) {
    return next(new AppError("Profile not found.", 404));
  }

  // 2. Check if job is already saved
  // We convert ObjectId to string for comparison
  const isJobSaved = seeker.savedJobs.some((id) => id.toString() === jobId);

  let message = "";

  if (isJobSaved) {
    // Remove job (Filter it out)
    seeker.savedJobs = seeker.savedJobs.filter((id) => id.toString() !== jobId);
    message = "Job removed from saved list.";
  } else {
    // Add job
    seeker.savedJobs.push(jobId);
    message = "Job saved successfully.";
  }

  await seeker.save({ validateBeforeSave: false }); // Save changes

  res.status(200).json({
    status: "success",
    message,
    data: {
      isSaved: !isJobSaved, // Return the new status
    },
  });
});
