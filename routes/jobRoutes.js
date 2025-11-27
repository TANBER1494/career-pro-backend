const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
// 👇 الكنترولر بتاع صاحبك (للشركات)
const jobController = require("../controllers/jobController");
// 👇 الكنترولر بتاعك (للعرض العام)
const jobPublicController = require("../controllers/jobPublicController");
const seekerApplicationController = require("../controllers/seekerApplicationController");
const upload = require("../utils/fileUpload");

const router = express.Router();

// حماية عامة
router.use(authMiddleware.protect);

// ============================================================
// 🌍 Public / Seeker Routes (عرض الوظائف)
// ============================================================
// هنا هنستخدم jobPublicController بدل jobController
router.get("/featured", jobPublicController.getFeaturedJobs);
router.get("/", jobPublicController.getAllJobs);
router.get("/:id", jobPublicController.getJob);

// ============================================================
// 🟢 Job Seeker Actions
// ============================================================
router.post(
  "/:jobId/apply",
  authMiddleware.restrictTo("job_seeker"),
  upload.single("cvFile"),
  seekerApplicationController.applyForJob
);

router.post(
  "/:jobId/save",
  authMiddleware.restrictTo("job_seeker"),
  seekerApplicationController.toggleSaveJob
);

// ============================================================
// 🔴 Company Routes (إدارة الوظائف)
// ============================================================
router.use(authMiddleware.restrictTo("company"));

// هنا بنستخدم jobController بتاع صاحبك عشان دي إدارة
router.post("/", jobController.createNewJob);

router
  .route("/:id")
  .patch(jobController.editJobDetails)
  .delete(jobController.deleteJob);

router.patch("/:id/status", jobController.updateJobStatus);

module.exports = router;
