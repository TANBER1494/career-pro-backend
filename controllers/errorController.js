const AppError = require("../utils/AppError");

// 1. Handle Cast Error (Invalid ID format)
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

// 2. Handle Duplicate Fields (E11000) - UPDATED MESSAGES
const handleDuplicateFieldsDB = (err) => {
  // Check if the error is related to the email field
  // (MongoDB error message usually contains the field name)
  if (err.keyValue && err.keyValue.email) {
    return new AppError(
      "This email address is already registered. Please log in instead.",
      409
    );
  }

  // Generic fallback for other duplicate fields
  const value = err.errmsg
    ? err.errmsg.match(/(["'])(\\?.)*?\1/)[0]
    : "Unknown";
  const message = `The value ${value} is already in use. Please try another one.`;
  return new AppError(message, 409);
};

// 3. Handle Validation Errors (e.g., Password too short)
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => {
    // Check if it's a password length error
    if (el.path === "password" && el.kind === "minlength") {
      return "Password must be at least 8 characters.";
    }
    // Check if it's a required field error
    if (el.kind === "required") {
      return `${el.path} is required.`;
    }
    // Default fallback
    return el.message;
  });

  const message = `Invalid input data. ${errors.join(" ")}`;
  return new AppError(message, 400);
};

// 4. Handle JWT Errors (Invalid Token) - NEW
const handleJWTError = () =>
  new AppError("Invalid token. Please log in again.", 401);

// 5. Handle JWT Expired (Expired Token) - NEW
const handleJWTExpiredError = () =>
  new AppError("Your token has expired. Please log in again.", 401);

// 6. Handle Multer File Size Error - NEW (Future proofing)
const handleMulterError = (err) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return new AppError("File is too large. Maximum size is 5MB.", 400);
  }
  return new AppError(err.message, 400);
};

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  }
  // Programming or other unknown error: don't leak details
  else {
    console.error("ERROR 💥", err);
    res.status(500).json({
      status: "error",
      message: "Something went very wrong!",
    });
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === "production") {
    let error = Object.create(err);
    error.message = err.message;

    // Manually copy missing properties
    if (err.name) error.name = err.name;
    if (err.code) error.code = err.code;
    if (err.keyValue) error.keyValue = err.keyValue; // Important for duplicates

    // --- DB Errors ---
    if (error.name === "CastError") error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === "ValidationError")
      error = handleValidationErrorDB(error);

    // --- Auth & Security Errors (NEW) ---
    if (error.name === "JsonWebTokenError") error = handleJWTError();
    if (error.name === "TokenExpiredError") error = handleJWTExpiredError();

    // --- File Upload Errors (NEW) ---
    if (error.name === "MulterError") error = handleMulterError(error);

    sendErrorProd(error, res);
  }
};
