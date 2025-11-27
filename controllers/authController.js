const jwt = require("jsonwebtoken");
const Authentication = require("../models/Authentication");
const JobSeeker = require("../models/JobSeeker");
const Company = require("../models/Company");
const AuthToken = require("../models/AuthToken");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

// Helper Function to generate JWT
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// ============================================================
// Authentication Logic
// ============================================================

exports.signup = catchAsync(async (req, res, next) => {
  // 1. Get user input
  const {
    email,
    password,
    passwordConfirm,
    accountType,
    // Dynamic fields based on account type
    firstName,
    lastName,
    companyName,
    companySize,
  } = req.body;

  // 2. Check Passwords
  if (password !== passwordConfirm) {
    return next(new AppError("Passwords do not match", 400));
  }

  // 3. Conditional Validation
  if (accountType === "company" && !companyName) {
    return next(
      new AppError("Company name is required for company accounts", 400)
    );
  }
  if (accountType === "job_seeker" && (!firstName || !lastName)) {
    return next(
      new AppError("First name and Last name are required for job seekers", 400)
    );
  }

  // 4. Create User (Authentication)
  const newUserAuth = await Authentication.create({
    email,
    password,
    accountType,
  });

  // 5. Create Profile based on account type
  if (accountType === "job_seeker") {
    await JobSeeker.create({
      authId: newUserAuth._id,
      fullName: `${firstName} ${lastName}`,
    });
  } else if (accountType === "company") {
    await Company.create({
      authId: newUserAuth._id,
      companyName: companyName,
      companySize: companySize || "1-10",
    });
  }

  // 6. Generate Verification Code (6 Digits)
  const verificationCode = Math.floor(
    100000 + Math.random() * 900000
  ).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // 7. Save Code to DB
  await AuthToken.create({
    authId: newUserAuth._id,
    token: verificationCode,
    tokenType: "email_verification",
    expiresAt,
  });

  // 8. Send Email (Simulated via Console)
  console.log(`🔐 VERIFICATION CODE FOR ${email}: ${verificationCode}`);

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

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError("Please provide email and password!", 400));
  }

  // 2) Check if user exists & password is correct
  const user = await Authentication.findOne({ email }).select("+password");

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect email or password", 401));
  }

  // 3) Check if user is verified
  if (!user.isVerified) {
    return next(
      new AppError(
        "Your account is not verified. Please check your email for the verification code.",
        403
      )
    );
  }

  // 4) If everything ok, send token
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

exports.getMe = catchAsync(async (req, res, next) => {
  // req.user is already available from 'protect' middleware
  const user = req.user;

  // Fetch profile data based on account type
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
        // Add profile info safely
        firstName:
          profile && profile.fullName ? profile.fullName.split(" ")[0] : "",
        lastName:
          profile && profile.fullName
            ? profile.fullName.split(" ").slice(1).join(" ")
            : "",
        companyName: profile ? profile.companyName : undefined,
      },
    },
  });
});
