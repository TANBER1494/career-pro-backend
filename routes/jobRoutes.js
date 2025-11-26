const express = require("express");
const authController = require("../controllers/authController");
const jobController = require("../controllers/jobController");

const router = express.Router();

// حماية
router.use(authController.protect);
router.use(authController.restrictTo("company"));

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