const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const Authentication = require("../models/Authentication");

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check if it's there
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

  // ============================================================
  // 💡 3.5) Security Check: Prevent Suspended Users (التعديل الجديد)
  // ============================================================
  if (currentUser.status === 'suspended') {
    return next(
      new AppError(
        "Access Denied. Your account has been suspended due to policy violations. Please log in again to check your status or contact support.",
        403
      )
    );
  }
  // ============================================================

  // 4) Check if user changed password after the token was issued
  // (We can implement changedPasswordAfter method in model later if needed)

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser; 
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.accountType)) {
      return next(
        new AppError("You do not have permission to perform this action", 403)
      );
    }
    next();
  };
};

// Middleware لمنع المستخدمين غير المكتملين من الوصول للميزات الأساسية
exports.requireCompleteProfile = catchAsync(async (req, res, next) => {
  if (req.user.registrationStep < 4) {
    return next(
      new AppError('You must complete your profile setup to access this feature.', 403)
    );
  }
  next();
});