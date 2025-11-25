const express = require("express");
const jobSeekerController = require("../controllers/jobSeekerController");
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

module.exports = router;
