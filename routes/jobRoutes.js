const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const jobController = require("../controllers/jobController");

const router = express.Router();

// ============================================================
// Public Routes
// ============================================================

router.get("/featured", jobController.getFeaturedJobs);

router.get("/", jobController.getAllJobs);

router.get("/:id", jobController.getJobDetails);

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

module.exports = router;
