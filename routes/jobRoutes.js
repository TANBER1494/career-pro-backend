const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const jobController = require("../controllers/jobController");
const applicationController = require("../controllers/applicationController");
const upload = require("../utils/fileUpload");
const router = express.Router();
const jobSeekerController = require("../controllers/jobSeekerController");

// ============================================================
// Public Routes
// ============================================================

router.get("/featured", jobController.getFeaturedJobs);

router.get("/", jobController.getAllJobs);

router.get("/:id", jobController.getJobDetails);

// Toggle Save Job
// URL: /api/v1/jobs/:id/save
router.post(
  "/:id/save",
  authMiddleware.protect,
  authMiddleware.restrictTo("job_seeker"),
  jobSeekerController.toggleSaveJob
);

// ============================================================
// Protected Routes (Company Only)
// ============================================================

router.use(authMiddleware.protect);

router.get(
  "/my-jobs",
  authMiddleware.restrictTo("company"),
  jobController.getCompanyJobs
);

router.post(
  "/",
  authMiddleware.restrictTo("company"),
  jobController.createNewJob
);

router
  .route("/:id")
  .patch(authMiddleware.restrictTo("company"), jobController.editJobDetails)
  .delete(authMiddleware.restrictTo("company"), jobController.deleteJob);

router.patch(
  "/:id/status",
  authMiddleware.restrictTo("company"),
  jobController.updateJobStatus
);

// ============================================================
// Job Seeker Actions
// ============================================================

// Apply for a job
// POST /api/v1/jobs/:id/apply
router.post(
  "/:id/apply",
  authMiddleware.protect,
  authMiddleware.restrictTo("job_seeker"),
  upload.single("cvFile"),
  applicationController.applyForJob
);

module.exports = router;
