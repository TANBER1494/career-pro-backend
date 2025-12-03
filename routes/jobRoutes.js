const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const jobController = require("../controllers/jobController");
const applicationController = require("../controllers/applicationController");
const upload = require("../utils/fileUpload");
const jobSeekerController = require("../controllers/jobSeekerController");

const router = express.Router();

// ============================================================
// 1. Specific Routes (يجب أن تكون في البداية)
// ============================================================

// Public: Featured Jobs
router.get("/featured", jobController.getFeaturedJobs);

// Protected: Get Company Jobs (يجب تعريفها قبل /:id)
router.get(
  "/my-jobs",
  authMiddleware.protect,
  authMiddleware.restrictTo("company"),
  jobController.getCompanyJobs
);

// Public: Get All Jobs (Search & Filter)
router.get("/", jobController.getAllJobs);

// ============================================================
// 2. Generic Routes with Parameters (مثل /:id)
// ============================================================

// Public: Get Job Details
// ⚠️ هذا المسار هو "المصيدة"، يجب أن يكون بعد المسارات المحددة
router.get("/:id", jobController.getJobDetails);

// ============================================================
// 3. Protected Actions (Job Seeker)
// ============================================================

// Toggle Save Job
router.post(
  "/:id/save",
  authMiddleware.protect,
  authMiddleware.restrictTo("job_seeker"),
  jobSeekerController.toggleSaveJob
);

// Apply for a job
router.post(
  "/:id/apply",
  authMiddleware.protect,
  authMiddleware.restrictTo("job_seeker"),
  upload.single("cvFile"),
  applicationController.applyForJob
);

// ============================================================
// 4. Protected Actions (Company Only)
// ============================================================

// Create Job
router.post(
  "/",
  authMiddleware.protect, // أضفنا الحماية هنا صراحةً للتنظيم
  authMiddleware.restrictTo("company"),
  jobController.createNewJob
);

// Update & Delete Job
router
  .route("/:id")
  .patch(
    authMiddleware.protect,
    authMiddleware.restrictTo("company"),
    jobController.editJobDetails
  )
  .delete(
    authMiddleware.protect,
    authMiddleware.restrictTo("company"),
    jobController.deleteJob
  );

// Update Job Status
router.patch(
  "/:id/status",
  authMiddleware.protect,
  authMiddleware.restrictTo("company"),
  jobController.updateJobStatus
);

module.exports = router;
