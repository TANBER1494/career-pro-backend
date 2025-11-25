const express = require("express");
const jobSeekerController = require("../controllers/jobSeekerController");
const applicationController = require("../controllers/applicationController");
const authController = require("../controllers/authController");
const upload = require("../utils/fileUpload");

const router = express.Router();

router.use(authController.protect);
router.use(authController.restrictTo("job_seeker"));

// --- Profile Routes ---
router.get("/me", jobSeekerController.getMe);
router.patch("/profile/step1", jobSeekerController.updateProfileStep1);
router.patch("/profile/step2", jobSeekerController.updateProfileStep2);
router.post(
  "/profile/step3",
  upload.single("cvFile"),
  jobSeekerController.uploadCV
);

// --- Application Routes ---
// Apply: POST /api/v1/job-seeker/jobs/:jobId/apply
router.post(
  "/jobs/:jobId/apply",
  upload.single("resume"),
  applicationController.applyForJob
);

// Save Job: POST /api/v1/job-seeker/jobs/:jobId/save
router.post("/jobs/:jobId/save", applicationController.toggleSaveJob);

module.exports = router;
