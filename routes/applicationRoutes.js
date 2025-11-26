const express = require("express");
const authController = require("../controllers/authController");
const applicationController = require("../controllers/applicationController");

const router = express.Router();

// حماية
router.use(authController.protect);
router.use(authController.restrictTo("company"));

// URL: /api/v1/applications/:appId/status
router.patch("/:appId/status", applicationController.updateApplicationStatus);

module.exports = router;