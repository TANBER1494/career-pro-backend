const jwt = require("jsonwebtoken");
const Authentication = require("../models/Authentication");
const JobSeeker = require("../models/JobSeeker");
const Company = require("../models/Company");
const AuthToken = require("../models/AuthToken");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const crypto = require("crypto");

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
        registrationStep: user.registrationStep, // ✅ الإضافة الضرورية هنا
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
        registrationStep: user.registrationStep,
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

exports.resendVerificationCode = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  // 1. Check if user exists
  const user = await Authentication.findOne({ email });
  if (!user) {
    return next(new AppError("User not found", 404));
  }

  // 2. Check if already verified
  if (user.isVerified) {
    return next(
      new AppError("This account is already verified. Please login.", 400)
    );
  }

  // 🛑 التعديل الجديد: حذف أي كود تفعيل قديم لهذا المستخدم
  await AuthToken.deleteMany({
    authId: user._id,
    tokenType: "email_verification",
  });

  // 3. Generate New Code
  const verificationCode = Math.floor(
    100000 + Math.random() * 900000
  ).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // 4. Save New Token
  await AuthToken.create({
    authId: user._id,
    token: verificationCode,
    tokenType: "email_verification",
    expiresAt,
  });

  // 5. Send Email
  console.log(`🔄 RESEND VERIFICATION CODE FOR ${email}: ${verificationCode}`);

  res.status(200).json({
    status: "success",
    message: "Verification code sent successfully.",
  });
});

// ============================================================
// Password Reset Logic
// ============================================================

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  const user = await Authentication.findOne({ email });

  if (!user) {
    return next(new AppError("There is no user with that email address.", 404));
  }

  // 1. Rate Limiting Check (التحقق من التكرار)
  const lastToken = await AuthToken.findOne({
    authId: user._id,
    tokenType: "password_reset",
    used: false,
    expiresAt: { $gt: Date.now() }, // ما زال سارياً
  }).sort({ createdAt: -1 }); // نأخذ الأحدث

  if (lastToken) {
    // نحسب الفرق بين الوقت الحالي ووقت إنشاء التوكن السابق
    const timeSinceLastRequest =
      (Date.now() - new Date(lastToken.createdAt).getTime()) / 1000;

    // مثلاً نضع حد أدنى 60 ثانية بين كل طلب
    const COOLDOWN_SECONDS = 60;

    if (timeSinceLastRequest < COOLDOWN_SECONDS) {
      const waitTime = Math.ceil(COOLDOWN_SECONDS - timeSinceLastRequest);
      return next(
        new AppError(
          `Please wait ${waitTime} seconds before requesting a new link.`,
          429
        )
      );
    }
  }

  // 2. Generate random reset token
  // نستخدم crypto لعمل توكن عشوائي قوي
  const resetToken = crypto.randomBytes(32).toString("hex");

  // 3. Set expiration (e.g., 1 hour)
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  // 4. Save token to DB
  await AuthToken.create({
    authId: user._id,
    token: resetToken,
    tokenType: "password_reset", // ✅ نستخدم النوع الموجود في الداتابيز
    expiresAt,
  });

  const resetURL = `http://localhost:5173/src/pages/auth/reset-password.html?token=${resetToken}`;
  // 6. Send Email (Simulated)
  const message = `Forgot your password? Submit your new password via this link: ${resetURL}.\nIf you didn't forget your password, please ignore this email!`;

  console.log("📧 =========================================");
  console.log(`📧 PASSWORD RESET LINK FOR ${email}:`);
  console.log(`🔗 ${resetURL}`);
  console.log("📧 =========================================");

  res.status(200).json({
    status: "success",
    message: "Token sent to email!",
  });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const { token } = req.params;
  const { password, passwordConfirm } = req.body;

  // 1. Find Token (كما هو)
  const tokenDoc = await AuthToken.findOne({
    token: token,
    tokenType: "password_reset",
    isUsed: false,
    expiresAt: { $gt: Date.now() },
  });

  if (!tokenDoc) {
    return next(new AppError("Token is invalid or has expired", 400));
  }

  // 2. Passwords Match (كما هو)
  if (password !== passwordConfirm) {
    return next(new AppError("Passwords do not match", 400));
  }

  // 3. Find User (كما هو)
  const user = await Authentication.findById(tokenDoc.authId).select(
    "+password"
  ); // تأكد من جلب الباسورد
  if (!user) {
    return next(new AppError("User not found.", 404));
  }

  // 4. Check if new password is same as old (الإضافة الجديدة)
  // نستخدم دالة المقارنة الموجودة في الموديل (أو bcrypt مباشرة)
  const isSamePassword = await user.correctPassword(password, user.password);

  if (isSamePassword) {
    return next(
      new AppError(
        "New password cannot be the same as your old password. Please choose a different one.",
        400
      )
    );
  }

  // 5. Update Password (كما هو)
  user.password = password;
  await user.save();

  // 6. Mark Token Used (كما هو)
  tokenDoc.isUsed = true;
  await tokenDoc.save();

  const jwtToken = signToken(user._id);

  res.status(200).json({
    status: "success",
    message: "Password updated successfully!",
    token: jwtToken,
    // نضيف نوع الحساب عشان الفرونت يعرف يوجه فين
    data: {
      user: {
        id: user._id,
        email: user.email,
        accountType: user.accountType,
        isVerified: user.isVerified,
        registrationStep: user.registrationStep, // مهم جداً للمشكلة الثالثة
      },
    },
  });
});
