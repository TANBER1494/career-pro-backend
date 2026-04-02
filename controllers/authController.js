const jwt = require('jsonwebtoken');
const Authentication = require('../models/Authentication');
const JobSeeker = require('../models/JobSeeker');
const Company = require('../models/Company');
const AuthToken = require('../models/AuthToken');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const crypto = require('crypto');
const sendEmail = require('../utils/email'); //
const Job = require('../models/Job');
const Blacklist = require('../models/Blacklist');

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
  const { email } = req.body;
  
  if (email) {
    const isBanned = await Blacklist.findOne({ email: email.toLowerCase() });
    
    if (isBanned) {
      console.log(`🛡️ Blacklist block triggered for email: ${email}`);
      return next(
        new AppError(
          'This email is permanently banned from our platform due to policy violations.',
          403
        )
      );
    }
  }
  // 1. Get user input
  const {
    password,
    passwordConfirm,
    accountType,
    firstName,
    lastName,
    companyName,
    companySize,
  } = req.body;

  if (!['job_seeker', 'company'].includes(accountType)) {
    return next(new AppError('Invalid account type. You can only register as a job_seeker or company.', 400));
  }
  // 2. Check Passwords
  if (password !== passwordConfirm) {
    return next(new AppError('Passwords do not match', 400));
  }

  // 3. Conditional Validation
  if (accountType === 'company' && !companyName) {
    return next(
      new AppError('Company name is required for company accounts', 400)
    );
  }
  if (accountType === 'job_seeker' && (!firstName || !lastName)) {
    return next(
      new AppError('First name and Last name are required for job seekers', 400)
    );
  }

  // 4. Create User (Authentication)
  const newUserAuth = await Authentication.create({
    email,
    password,
    accountType,
  });

  // 5. Create Profile based on account type
  if (accountType === 'job_seeker') {
    await JobSeeker.create({
      authId: newUserAuth._id,
      fullName: `${firstName} ${lastName}`,
    });
  } else if (accountType === 'company') {
    await Company.create({
      authId: newUserAuth._id,
      companyName: companyName,
      companySize: companySize || '1-10',
    });
  }

  // 6. Generate Verification Code
  const verificationCode = Math.floor(
    100000 + Math.random() * 900000
  ).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // 7. Save Code to DB
  await AuthToken.create({
    authId: newUserAuth._id,
    token: verificationCode,
    tokenType: 'email_verification',
    expiresAt,
  });

  // 8. Send Email (Actual Sending) ✅
  try {
    await sendEmail({
      email: newUserAuth.email,
      subject: 'Verify your account - AI-Career Guidance',
      message: verificationCode, // سيظهر داخل القالب HTML
    });
  } catch (err) {
    // التراجع في حالة الفشل
    await Authentication.findByIdAndDelete(newUserAuth._id);
    await AuthToken.deleteMany({ authId: newUserAuth._id });
    if (accountType === 'job_seeker')
      await JobSeeker.deleteOne({ authId: newUserAuth._id });
    if (accountType === 'company')
      await Company.deleteOne({ authId: newUserAuth._id });

    console.error('Email Error:', err);
    return next(
      new AppError(
        'There was an error sending the email. Please try again later!',
        500
      )
    );
  }

  res.status(201).json({
    status: 'success',
    message: 'User registered successfully. Please check your email.',
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

  const user = await Authentication.findOne({ email });
  if (!user) return next(new AppError('User not found', 404));
  if (user.isVerified)
    return next(new AppError('User is already verified', 400));

  const authToken = await AuthToken.findOne({
    authId: user._id,
    token: verificationCode,
    tokenType: 'email_verification',
    isUsed: false,
    expiresAt: { $gt: Date.now() },
  });

  if (!authToken)
    return next(new AppError('Invalid or expired verification code', 400));

  user.isVerified = true;
  await user.save();

  authToken.isUsed = true;
  await authToken.save();

  const token = signToken(user._id);

  res.status(200).json({
    status: 'success',
    message: 'Email verified successfully.',
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

exports.resendVerificationCode = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  const user = await Authentication.findOne({ email });

  if (!user) return next(new AppError('User not found', 404));
  if (user.isVerified)
    return next(new AppError('This account is already verified.', 400));

  await AuthToken.deleteMany({
    authId: user._id,
    tokenType: 'email_verification',
  });

  const verificationCode = Math.floor(
    100000 + Math.random() * 900000
  ).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await AuthToken.create({
    authId: user._id,
    token: verificationCode,
    tokenType: 'email_verification',
    expiresAt,
  });

  // Send Email (Actual Sending) ✅
  try {
    await sendEmail({
      email: user.email,
      subject: 'New Verification Code - AI-Career Guidance',
      message: verificationCode,
    });
  } catch (err) {
    return next(new AppError('Could not send email. Try again later.', 500));
  }

  res.status(200).json({
    status: 'success',
    message: 'Verification code sent successfully.',
  });
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password)
    return next(new AppError('Please provide email and password!', 400));

  // استدعاء المستخدم مع الباسورد
  const user = await Authentication.findOne({ email }).select('+password');
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  // ============================================================
  // 💡 Lazy Deletion & Suspension Logic (التعديل الجديد)
  // ============================================================
  if (user.status === 'suspended') {
    const now = Date.now();
    const expiryDate = new Date(user.suspensionExpires).getTime();

    // ❌ الحالة الأولى: انتهت مهلة الـ 3 أيام (إعدام الحساب)
    if (now > expiryDate) {
      
      // ==========================================
      // 🚨 0. إضافة الإيميل للقائمة السوداء قبل الحذف (التعديل الجديد)
      // ==========================================
      await Blacklist.create({
        email: user.email,
        reason: user.suspensionReason || 'Account deleted after suspension period expired'
      });
      console.log(`🚫 Blacklist Updated: ${user.email} is permanently banned.`);
      // ==========================================

      // 1. مسح البروفايل الخاص بالمستخدم والوظائف لو كان شركة
      if (user.accountType === 'job_seeker') {
        await JobSeeker.findOneAndDelete({ authId: user._id });
      } else if (user.accountType === 'company') {
        const comp = await Company.findOneAndDelete({ authId: user._id });
        if (comp) {
           await Job.deleteMany({ companyId: comp._id });
        }
      }

      // 2. مسح أي توكنز قديمة (زي الإيميل أو نسيان الباسورد)
      // (تأكد إن موديل AuthToken مستدعى لو بتستخدمه، أو احذفه لو مش عندك)
      // await AuthToken.deleteMany({ authId: user._id });

      // 3. مسح حساب الدخول الأساسي
      await Authentication.findByIdAndDelete(user._id);

      console.log(`🗑️ Lazy Deletion triggered: User ${user.email} permanently deleted.`);

      return next(
        new AppError(
          'Your account has been permanently deleted because the 3-day appeal period has expired.',
          403
        )
      );
    }
    // ⏳ الحالة الثانية: مهلة الـ 3 أيام لم تنتهِ (منع الدخول فقط)
    else {
      const remainingTime = new Date(user.suspensionExpires).toLocaleString();
      return next(
        new AppError(
          `Your account is suspended due to policy violations. You have until ${remainingTime} to appeal. Please contact support at careerguidanceapp001@gmail.com`,
          403
        )
      );
    }
  }
  // ============================================================

  if (!user.isVerified) {
    return next(
      new AppError(
        'Your account is not verified. Please check your email.',
        403
      )
    );
  }

  const token = signToken(user._id);

  res.status(200).json({
    status: 'success',
    token,
    data: {
      user: {
        id: user._id,
        email: user.email,
        accountType: user.accountType,
        isVerified: user.isVerified,
        registrationStep: user.registrationStep,
      },
    },
  });
});

exports.getMe = catchAsync(async (req, res, next) => {
  const user = req.user;
  let profile = null;
  if (user.accountType === 'job_seeker') {
    profile = await JobSeeker.findOne({ authId: user._id });
  } else if (user.accountType === 'company') {
    profile = await Company.findOne({ authId: user._id });
  }

  res.status(200).json({
    status: 'success',
    data: {
      user: {
        id: user._id,
        email: user.email,
        accountType: user.accountType,
        isVerified: user.isVerified,
        registrationStep: user.registrationStep,
        firstName: profile?.fullName?.split(' ')[0] || '',
        lastName: profile?.fullName?.split(' ').slice(1).join(' ') || '',
        companyName: profile?.companyName,
      },
    },
  });
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  const user = await Authentication.findOne({ email });
  if (!user) return next(new AppError('User not found.', 404));

  // Rate Limiting
  const lastToken = await AuthToken.findOne({
    authId: user._id,
    tokenType: 'password_reset',
    isUsed: false,
    expiresAt: { $gt: Date.now() },
  }).sort({ createdAt: -1 });

  if (lastToken) {
    const timeSinceLastRequest =
      (Date.now() - new Date(lastToken.createdAt).getTime()) / 1000;
    if (timeSinceLastRequest < 60) {
      return next(
        new AppError(
          `Please wait ${Math.ceil(60 - timeSinceLastRequest)} seconds.`,
          429
        )
      );
    }
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await AuthToken.create({
    authId: user._id,
    token: resetToken,
    tokenType: 'password_reset',
    expiresAt,
  });

  const resetURL = `https://careerpro.me/reset-password?token=${resetToken}`;
  
  // Custom HTML for Reset Email
  const resetHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; background: #f6f9fc; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #fff; padding: 30px; border-radius: 10px; text-align: center; }
        .btn { display: inline-block; background: #ef4444; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Reset Your Password</h2>
        <p>Click the button below to set a new password:</p>
        <a href="${resetURL}" class="btn">Reset Password</a>
        <p style="font-size: 12px; color: #666;">Or copy this link: <br> ${resetURL}</p>
      </div>
    </body>
    </html>
  `;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Password Reset Request',
      message: `Reset link: ${resetURL}`,
      html: resetHtml,
    });

    res
      .status(200)
      .json({ status: 'success', message: 'Token sent to email!' });
  } catch (err) {
    await AuthToken.deleteOne({ authId: user._id, token: resetToken });
    return next(new AppError('Error sending email.', 500));
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const { token } = req.params;
  const { password, passwordConfirm } = req.body;

  const tokenDoc = await AuthToken.findOne({
    token: token,
    tokenType: 'password_reset',
    isUsed: false,
    expiresAt: { $gt: Date.now() },
  });

  if (!tokenDoc)
    return next(new AppError('Token is invalid or has expired', 400));
  if (password !== passwordConfirm)
    return next(new AppError('Passwords do not match', 400));

  const user = await Authentication.findById(tokenDoc.authId).select(
    '+password'
  );
  if (!user) return next(new AppError('User not found.', 404));

  if (await user.correctPassword(password, user.password)) {
    return next(
      new AppError('New password cannot be the same as old password.', 400)
    );
  }

  user.password = password;
  await user.save();

  tokenDoc.isUsed = true;
  await tokenDoc.save();

  const jwtToken = signToken(user._id);

  res.status(200).json({
    status: 'success',
    message: 'Password updated successfully!',
    token: jwtToken,
    data: {
      user: {
        id: user._id,
        email: user.email,
        accountType: user.accountType,
        isVerified: user.isVerified,
        registrationStep: user.registrationStep,
      },
    },
  });
});
