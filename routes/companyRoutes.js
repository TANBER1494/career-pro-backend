const express = require("express");

// Middlewares
const authMiddleware = require("../middlewares/authMiddleware");

// Controllers
const companyController = require("../controllers/companyController");
const applicationController = require("../controllers/applicationController"); // سنحتاجه لعرض قائمة المتقدمين
const upload = require("../utils/fileUpload");

const router = express.Router();

// Protect all routes below (Company Only)
router.use(authMiddleware.protect);
router.use(authMiddleware.restrictTo("company"));

// --- Dashboard ---
router.get("/dashboard", companyController.getCompanyStats); // ✅ تم التوجيه لـ companyController

// --- Profile Management ---
router.get("/profile", companyController.getCompanyProfile);

// نستخدم نفس الدالة للتحديث الجزئي (Step 1 & Step 2)
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
// URL: /api/v1/company/applications
router.get("/applications", applicationController.getCompanyApplications);

module.exports = router;
