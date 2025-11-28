const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const companyController = require("../controllers/companyController");
const companyPublicController = require("../controllers/companyPublicController");
const applicationController = require("../controllers/applicationController");
const upload = require("../utils/fileUpload");

const router = express.Router();

// ============================================================
// 1. Specific Public Routes ()
// ============================================================

// Get Top Companies (Home Page)
router.get("/top", companyPublicController.getTopCompanies);

// ============================================================
// 2. Protected Routes ()
// ============================================================

// --- Dashboard ---
router.get(
  "/dashboard",
  authMiddleware.protect,
  authMiddleware.restrictTo("company"),
  companyController.getCompanyStats
);

// --- Profile Management ---
router.get(
  "/profile",
  authMiddleware.protect,
  authMiddleware.restrictTo("company"),
  companyController.getCompanyProfile
);

// Update Profile (Step 1 & Step 2)
router.patch(
  "/profile/step1",
  authMiddleware.protect,
  authMiddleware.restrictTo("company"),
  companyController.updateCompanyProfile
);
router.patch(
  "/profile/step2",
  authMiddleware.protect,
  authMiddleware.restrictTo("company"),
  companyController.updateCompanyProfile
);

// Uploads
router.post(
  "/profile/step3",
  authMiddleware.protect,
  authMiddleware.restrictTo("company"),
  upload.single("verificationDocument"),
  companyController.uploadVerificationDoc
);

router.post(
  "/profile/logo",
  authMiddleware.protect,
  authMiddleware.restrictTo("company"),
  upload.single("logoFile"),
  companyController.uploadCompanyLogo
);

// --- Applications View ---
router.get(
  "/applications",
  authMiddleware.protect,
  authMiddleware.restrictTo("company"),
  applicationController.getCompanyApplications
);

// ============================================================
// 3. Generic Public Routes ()
// ============================================================

// Search & Filter Companies
router.get("/", companyPublicController.getAllCompanies);

// Get Company Details (Public View for Seekers)
router.get("/:id", companyPublicController.getCompanyDetails);

module.exports = router;
