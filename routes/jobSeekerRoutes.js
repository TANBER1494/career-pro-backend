const express = require("express");
const jobSeekerController = require("../controllers/jobSeekerController");
const upload = require("../utils/fileUpload");
const authMiddleware = require("../middlewares/authMiddleware");
const router = express.Router();

router.use(authMiddleware.protect);
router.use(authMiddleware.restrictTo("job_seeker"));

// --- Profile Routes ---
router.get("/me", jobSeekerController.getMe);
router.patch("/profile/step1", jobSeekerController.updateProfileStep1);
router.patch("/profile/step2", jobSeekerController.updateProfileStep2);
router.post(
  "/profile/step3",
  upload.single("cvFile"),
  jobSeekerController.uploadCV
);
router.get("/profile", jobSeekerController.getMe);

module.exports = router;
