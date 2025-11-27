const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { promisify } = require("util");
const Authentication = require("../models/Authentication");
const JobSeeker = require("../models/JobSeeker");
const Company = require("../models/Company");
const AuthToken = require("../models/AuthToken"); // تأكد إن الملف ده موجود
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// ============================================================
// 1. SIGNUP
// ============================================================
exports.signup = catchAsync(async (req, res, next) => {
  // 1) Get user input
  const {
    email,
    password,
    passwordConfirm,
    accountType,
    firstName,
    lastName,
    companyName,
  } = req.body;

  // 2) Validation based on Account Type
  if (accountType === "job_seeker") {
    if (!firstName || !lastName) {
      return next(new AppError("First name and Last name are required.", 400));
    }
  } else if (accountType === "company") {
    if (!companyName) {
      return next(new AppError("Company name is required.", 400));
    }
  } else {
    return next(new AppError("Invalid account type.", 400));
  }

  if (password !== passwordConfirm) {
    return next(new AppError("Passwords do not match", 400));
  }

  // 3) Create Authentication Record
  const newUserAuth = await Authentication.create({
    email,
    password,
    accountType,
  });

  // 4) Create Profile
  if (accountType === "job_seeker") {
    await JobSeeker.create({
      authId: newUserAuth._id,
      fullName: `${firstName} ${lastName}`,
    });
  } else if (accountType === "company") {
    await Company.create({
      authId: newUserAuth._id,
      companyName: companyName,
      companySize: "1-10",
    });
  }

  // 5) Generate Verification Code (OTP)
  const verificationCode = Math.floor(
    100000 + Math.random() * 900000
  ).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

  // 6) Save Code to DB (AuthToken)
  await AuthToken.create({
    authId: newUserAuth._id,
    token: verificationCode,
    tokenType: "email_verification",
    expiresAt,
  });

  // 7) Simulate Sending Email (Console Log)
  // (بعدين هنبدلها بـ sendEmail الحقيقية)
  console.log(`🔐 VERIFICATION CODE FOR ${email}: ${verificationCode}`);

  // 8) Send Response (No Token yet)
  res.status(201).json({
    status: "success",
    message:
      "User registered successfully. Please check your email to verify your account.",
    data: {
      user: {
        id: newUserAuth._id,
        email: newUserAuth.email,
        accountType: newUserAuth.accountType,
        isVerified: newUserAuth.isVerified,
      },
    },
  });
});

// ============================================================
// 2. VERIFY EMAIL
// ============================================================
exports.verifyEmail = catchAsync(async (req, res, next) => {
  const { email, verificationCode } = req.body;

  // 1. Get user
  const user = await Authentication.findOne({ email });
  if (!user) {
    return next(new AppError("User not found", 404));
  }

  if (user.isVerified) {
    return next(new AppError("User is already verified", 400));
  }

  // 2. Check Token
  const authToken = await AuthToken.findOne({
    authId: user._id,
    token: verificationCode,
    tokenType: "email_verification",
    isUsed: false,
    expiresAt: { $gt: Date.now() },
  });

  if (!authToken) {
    return next(new AppError("Invalid or expired verification code", 400));
  }

  // 3. Verify User
  user.isVerified = true;
  await user.save();

  // 4. Mark Token as Used
  authToken.isUsed = true;
  await authToken.save();

  // 5. Generate JWT & Send Response
  const token = signToken(user._id);

  res.status(200).json({
    status: "success",
    message: "Email verified successfully.",
    token,
    data: {
      user: {
        id: user._id,
        email: user.email,
        accountType: user.accountType,
        isVerified: true,
      },
    },
  });
});

// ============================================================
// 3. LOGIN
// ============================================================
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError("Please provide email and password!", 400));
  }

  const user = await Authentication.findOne({ email }).select("+password");

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect email or password", 401));
  }

  if (!user.isVerified) {
    return next(
      new AppError(
        "Your account is not verified. Please check your email.",
        403
      )
    );
  }

  const token = signToken(user._id);

  res.status(200).json({
    status: "success",
    token,
    data: {
      user: {
        id: user._id,
        email: user.email,
        accountType: user.accountType,
        isVerified: user.isVerified,
      },
    },
  });
});

// ============================================================
// 4. GET ME
// ============================================================
exports.getMe = catchAsync(async (req, res, next) => {
  const user = req.user;
  let profile = null;

  if (user.accountType === "job_seeker") {
    profile = await JobSeeker.findOne({ authId: user._id });
  } else if (user.accountType === "company") {
    profile = await Company.findOne({ authId: user._id });
  }

  res.status(200).json({
    status: "success",
    data: {
      user: {
        id: user._id,
        email: user.email,
        accountType: user.accountType,
        isVerified: user.isVerified,
        // Safe navigation (?.) to prevent errors if profile is missing
        firstName: profile?.fullName?.split(" ")[0] || "",
        lastName: profile?.fullName?.split(" ").slice(1).join(" ") || "",
        companyName: profile?.companyName || undefined,
      },
    },
  });
});
