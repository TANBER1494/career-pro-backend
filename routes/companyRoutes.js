const express = require("express");

// Middlewares
const authMiddleware = require("../middlewares/authMiddleware");

// Controllers
const companyController = require("../controllers/companyController");
const companyPublicController = require("../controllers/companyPublicController");
const applicationController = require("../controllers/applicationController");
const upload = require("../utils/fileUpload");

const router = express.Router();

// ============================================================
// 1. Public Routes (No Login Required) 🌍
// ============================================================

// Get Top Companies (Home Page)
router.get("/top", companyPublicController.getTopCompanies);

// Search & Filter Companies
router.get("/", companyPublicController.getAllCompanies);

// Get Company Details (Public View for Seekers)
router.get("/:id/public", companyPublicController.getCompanyDetails);


// ============================================================
// 2. Protected Routes (Company Only) 🔒
// ============================================================

// Apply protection to all routes below
router.use(authMiddleware.protect);
router.use(authMiddleware.restrictTo("company"));

// --- Dashboard ---
router.get("/dashboard", companyController.getCompanyStats);

// --- Profile Management ---
router.get("/profile", companyController.getCompanyProfile);

// Update Profile (Step 1 & Step 2)
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
