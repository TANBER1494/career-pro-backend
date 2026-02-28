const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const Authentication = require("../models/Authentication");

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token... (كودك الحالي كما هو)
  // 2) Verification token... (كودك الحالي كما هو)

  // 3) Check if user still exists
  const currentUser = await Authentication.findById(decoded.id);
  if (!currentUser) {
    return next(new AppError('The user belonging to this token does no longer exist.', 401));
  }

  // 💡 فحص الإيقاف أثناء تصفح الموقع (Real-time Block)
  if (currentUser.status === 'suspended') {
    if (currentUser.suspensionExpires && currentUser.suspensionExpires > Date.now()) {
      return next(
        new AppError('Your account is currently suspended. Access denied.', 403)
      );
    }
    // إعادة تنشيط إذا انتهى الوقت أثناء التصفح
    currentUser.status = 'active';
    currentUser.suspensionExpires = undefined;
    currentUser.suspensionReason = undefined;
    await currentUser.save({ validateBeforeSave: false });
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser;
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


// Middleware لمنع المستخدمين غير المكتملين من الوصول للميزات الأساسية
exports.requireCompleteProfile = catchAsync(async (req, res, next) => {
  // بنفترض إنك بتستخدم authMiddleware.protect قبله، فـ req.user موجودة
  if (req.user.registrationStep < 4) {
    return next(
      new AppError('You must complete your profile setup to access this feature.', 403)
    );
  }
  next();
});