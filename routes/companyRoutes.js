const express = require("express");
const authController = require("../controllers/authController");
const companyController = require("../controllers/companyController");
const jobController = require("../controllers/jobController");
const applicationController = require("../controllers/applicationController");
const upload = require("../utils/fileUpload");

const router = express.Router();

// حماية لكل الروابط
router.use(authController.protect);
router.use(authController.restrictTo("company"));

// --- Dashboard ---
// URL: /api/v1/company/dashboard
router.get("/dashboard", jobController.getCompanyStats);

// --- Profile Management ---
// URL: /api/v1/company/profile...
router.get("/profile", companyController.getCompanyProfile);
router.patch("/profile/step1", companyController.updateCompanyProfile);
router.patch("/profile/step2", companyController.updateCompanyProfile);
router.post("/profile/step3", upload.single("verificationDocument"), companyController.uploadVerificationDoc);
router.post("/profile/logo", upload.single("logoFile"), companyController.uploadCompanyLogo);

// --- Applications (View Only) ---
// URL: /api/v1/company/applications
// حطيناه هنا عشان الرابط في Postman بيبدأ بـ /company
router.get("/applications", applicationController.getCompanyApplications);

module.exports = router;