const express = require("express");

// Middlewares
const authMiddleware = require("../middlewares/authMiddleware");

// Controllers
const companyController = require("../controllers/companyController"); // (Dev 3)
const applicationController = require("../controllers/applicationController");
// 👇 الكنترولر الجديد بتاعك
const companyPublicController = require("../controllers/companyPublicController");
const upload = require("../utils/fileUpload");

const router = express.Router();

// ============================================================
// 🌍 Public Routes (استكشاف الشركات - متاح للكل)
// ============================================================
// ⚠️ هام: لازم يتحطوا في الأول قبل الـ protect

// 1. Top Companies (Random)
router.get("/top", companyPublicController.getTopCompanies);

// 2. All Companies (Search & Filter)
router.get("/", companyPublicController.getAllCompanies);

// 3. Single Company Details (Public View)
// استخدمنا /:id/public عشان نفرقها عن أي روت تاني ممكن يكون فيه ID
router.get("/:id/public", companyPublicController.getCompanyDetails);

// ============================================================
// 🔒 Protected Routes (إدارة الشركة - Company Only)
// ============================================================
// ⛔ أي حاجة تحت السطر ده محتاجة توكن شركة
router.use(authMiddleware.protect);
router.use(authMiddleware.restrictTo("company"));

// --- Dashboard ---
router.get("/dashboard", companyController.getCompanyStats);

// --- Profile Management ---
router.get("/profile", companyController.getCompanyProfile);

router.patch("/profile/step1", companyController.updateCompanyProfile);
router.patch("/profile/step2", companyController.updateCompanyProfile);

// Uploads
router.post(
  "/profile/step3",
  upload.single("verificationDocument"),
  companyController.uploadVerificationDoc
);

router.post(
  "/profile/logo",
  upload.single("logoFile"),
  companyController.uploadCompanyLogo
);

// --- Applications View ---
router.get("/applications", applicationController.getCompanyApplications);

module.exports = router;
