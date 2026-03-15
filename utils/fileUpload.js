const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const AppError = require('./AppError'); // Adjust path if needed
const path = require('path');

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

// ================= 2. FILE FILTER (Strict Security Check) =================
const fileFilter = (req, file, cb) => {
  // 1. استخراج امتداد الملف وتحويله لحروف صغيرة (مثال: .PDF -> .pdf)
  const ext = path.extname(file.originalname).toLowerCase();

  // 2. القوائم البيضاء للامتدادات المسموحة (Whitelists)
  const allowedDocExts = ['.pdf', '.doc', '.docx'];
  const allowedImageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

  if (file.fieldname === 'cvFile' || file.fieldname === 'verificationDocument') {
    // فحص مزدوج: الهيدر + الامتداد الحقيقي
    const isMimeValid = 
      file.mimetype === 'application/pdf' ||
      file.mimetype === 'application/msword' ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    
    const isExtValid = allowedDocExts.includes(ext);

    if (isMimeValid && isExtValid) {
      cb(null, true);
    } else {
      cb(new AppError('Security Alert: Invalid document! Please upload only true PDF or DOC/DOCX files.', 400), false);
    }

  } else if (file.fieldname === 'logoFile' || file.fieldname === 'profileImage') {
    // فحص مزدوج: الهيدر + الامتداد الحقيقي
    const isMimeValid = file.mimetype.startsWith('image/');
    const isExtValid = allowedImageExts.includes(ext);

    if (isMimeValid && isExtValid) {
      cb(null, true);
    } else {
      cb(new AppError('Security Alert: Invalid image format! Please upload only valid JPG, PNG, GIF, or WEBP files.', 400), false);
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
