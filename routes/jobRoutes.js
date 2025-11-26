const express = require("express");
// 1. استدعاء ملف الحماية الجديد
const authMiddleware = require("../middlewares/authMiddleware");
const jobController = require("../controllers/jobController");

const router = express.Router();

// 2. استخدام الحماية من الملف الجديد
router.use(authMiddleware.protect);
router.use(authMiddleware.restrictTo("company"));

// URL: /api/v1/jobs
router.route("/")
  .post(jobController.createNewJob)
  .get(jobController.getAllJobs);

// URL: /api/v1/jobs/:id
router.route("/:id")
  .patch(jobController.editJobDetails)
  .delete(jobController.deleteJob);

// URL: /api/v1/jobs/:id/status
router.patch("/:id/status", jobController.updateJobStatus);

module.exports = router;