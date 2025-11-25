const multer = require("multer");
const AppError = require("./AppError");

// 1. Configure Storage (Where to save files)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Determine folder based on file type or route
    // You need to ensure these folders exist in your root directory
    let folder = "uploads/";

    if (file.fieldname === "cvFile") {
      folder = "uploads/cvs/";
    } else if (file.fieldname === "logoFile") {
      folder = "uploads/images/";
    } else if (file.fieldname === "verificationDocument") {
      folder = "uploads/docs/";
    }

    cb(null, folder);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: user-userId-timestamp.ext
    // e.g., user-60d5ec...-16400000.pdf
    const ext = file.mimetype.split("/")[1];
    // If request has user (from protect middleware), use id, else use 'guest'
    const userId = req.user ? req.user._id : "guest";
    cb(null, `user-${userId}-${Date.now()}.${ext}`);
  },
});

// 2. File Filter (Security check)
const fileFilter = (req, file, cb) => {
  if (
    file.fieldname === "cvFile" ||
    file.fieldname === "verificationDocument"
  ) {
    // Allow only PDFs and Docs
    if (
      file.mimetype === "application/pdf" ||
      file.mimetype === "application/msword" ||
      file.mimetype ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      cb(null, true);
    } else {
      cb(
        new AppError(
          "Not a valid document! Please upload PDF or DOC/DOCX.",
          400
        ),
        false
      );
    }
  } else if (file.fieldname === "logoFile") {
    // Allow only Images
    if (file.mimetype.startsWith("image")) {
      cb(null, true);
    } else {
      cb(new AppError("Not an image! Please upload only images.", 400), false);
    }
  } else {
    cb(new AppError("Unknown file field!", 400), false);
  }
};

// 3. Export the Multer Instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit 5MB
});

module.exports = upload;
