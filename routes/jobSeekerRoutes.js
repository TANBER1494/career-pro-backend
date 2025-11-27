const express = require("express");
const jobSeekerController = require("../controllers/jobSeekerController");

const seekerApplicationController = require("../controllers/seekerApplicationController");
const upload = require("../utils/fileUpload");

const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

router.use(authMiddleware.protect);
router.use(authMiddleware.restrictTo("job_seeker"));

// 1. Profile Management

router.get("/profile", jobSeekerController.getMe);

router.patch("/profile/step1", jobSeekerController.updateProfileStep1);
router.patch("/profile/step2", jobSeekerController.updateProfileStep2);
router.post(
  "/profile/step3",
  upload.single("cvFile"),
  jobSeekerController.uploadCV
);

// 2. Job Applications & Actions
// Apply for Job (CV upload required)
router.post(
  "/jobs/:jobId/apply",
  upload.single("resume"),
  seekerApplicationController.applyForJob
);

// Save/Unsave Job
router.post("/jobs/:jobId/save", seekerApplicationController.toggleSaveJob);

module.exports = router;
