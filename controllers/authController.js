const Authentication = require("../models/Authentication");
const JobSeeker = require("../models/JobSeeker");
const Company = require("../models/Company");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const jwt = require("jsonwebtoken");
const { promisify } = require("util");

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  // 1) Get user input
  const { email, password, passwordConfirm, accountType, ...otherData } =
    req.body;

  // 2) Basic Validation (Clean & Explicit)
  if (password !== passwordConfirm) {
    return next(new AppError("Passwords do not match", 400));
  }

  // 3) Create the Authentication Record (The User)
  const newUserAuth = await Authentication.create({
    email,
    password,
    accountType,
  });

  // 4) Create the Profile based on account type
  // Note: We use empty profile initially, user completes it later via PATCH steps
  if (accountType === "job_seeker") {
    await JobSeeker.create({
      authId: newUserAuth._id,
      fullName: otherData.firstName + " " + otherData.lastName, // Combining names as agreed
    });
  } else if (accountType === "company") {
    await Company.create({
      authId: newUserAuth._id,
      companyName: otherData.companyName || "Company Name Pending", // Placeholder
      companySize: otherData.companySize || "1-10", // Default required value
    });
  }

  // 5) Send Response (NO TOKEN as per Contract)
  // We should ideally send an email here (Simulated for now)

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

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError("Please provide email and password!", 400));
  }

  // 2) Check if user exists & password is correct
  // We need to explicitly select password because it's select: false in schema
  const user = await Authentication.findOne({ email }).select("+password");

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect email or password", 401));
  }

  // 3) If everything ok, send token to client
  const token = signToken(user._id); // سنحتاج لتعريف هذه الدالة

  res.status(200).json({
    status: "success",
    token,
    data: {
      user: {
        id: user._id,
        email: user.email,
        accountType: user.accountType,
      },
    },
  });
});

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check of it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401)
    );
  }

  // 2) Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user still exists
  const currentUser = await Authentication.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError(
        "The user belonging to this token does no longer exist.",
        401
      )
    );
  }

  // 4) Check if user changed password after the token was issued
  // (We can implement changedPasswordAfter method in model later if needed)

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser; // Important: We save user info in req to use it in next middlewares
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles ['admin', 'company']. role='job_seeker'
    if (!roles.includes(req.user.accountType)) {
      return next(
        new AppError("You do not have permission to perform this action", 403)
      );
    }
    next();
  };
};
