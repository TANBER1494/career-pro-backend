const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const applicationController = require("../controllers/applicationController");

const router = express.Router();

// 2. استخدام الحماية من الملف الجديد
router.use(authMiddleware.protect);
router.use(authMiddleware.restrictTo("company"));

// URL: /api/v1/applications/:appId/status
router.patch("/:appId/status", applicationController.updateApplicationStatus);

module.exports = router;