const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const jobController = require("../controllers/jobController");

const router = express.Router();

router.use(authMiddleware.protect);
router.use(authMiddleware.restrictTo("company"));

// URL: /api/v1/jobs
router
  .route("/")
  .post(jobController.createNewJob)
  .get(jobController.getAllJobs);

// URL: /api/v1/jobs/:id
router
  .route("/:id")
  .patch(jobController.editJobDetails)
  .delete(jobController.deleteJob);

// URL: /api/v1/jobs/:id/status
router.patch("/:id/status", jobController.updateJobStatus);

module.exports = router;
