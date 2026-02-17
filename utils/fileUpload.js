const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const AppError = require('./AppError'); // Adjust path if needed

// ================= CLOUDINARY CONFIGURATION =================
// Ensure your .env variables are loaded before this file runs
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ================= 1. CONFIGURE STORAGE (Cloudinary) =================
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    let folderName = 'careerpro/misc';
    let resourceType = 'auto';

    if (file.fieldname === 'cvFile') {
      folderName = 'careerpro/cvs';
      resourceType = 'auto';
    } else if (file.fieldname === 'logoFile') {
      folderName = 'careerpro/images';
      resourceType = 'image';
    } else if (file.fieldname === 'profileImage') {
      folderName = 'careerpro/avatars';
      resourceType = 'image';
    } else if (file.fieldname === 'verificationDocument') {
      folderName = 'careerpro/docs';
      resourceType = 'auto';
    }

    const userId = req.user ? req.user._id : 'guest';
    const publicId = `user-${userId}-${Date.now()}`;

    return {
      folder: folderName,
      resource_type: resourceType,
      public_id: publicId,
    };
  },
});

// ================= 2. FILE FILTER (Security Check) =================
// Kept exactly as your original solid logic
const fileFilter = (req, file, cb) => {
  if (
    file.fieldname === 'cvFile' ||
    file.fieldname === 'verificationDocument'
  ) {
    if (
      file.mimetype === 'application/pdf' ||
      file.mimetype === 'application/msword' ||
      file.mimetype ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      cb(null, true);
    } else {
      cb(
        new AppError(
          'Not a valid document! Please upload PDF or DOC/DOCX.',
          400
        ),
        false
      );
    }
  } else if (
    file.fieldname === 'logoFile' ||
    file.fieldname === 'profileImage'
  ) {
    if (file.mimetype.startsWith('image')) {
      cb(null, true);
    } else {
      cb(new AppError('Not an image! Please upload only images.', 400), false);
    }
  } else {
    cb(new AppError('Unknown file field!', 400), false);
  }
};

// ================= 3. EXPORT MULTER INSTANCE =================
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit 5MB
});

module.exports = upload;
