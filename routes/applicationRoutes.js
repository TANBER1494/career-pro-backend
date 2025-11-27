const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const applicationController = require("../controllers/applicationController");

const router = express.Router();

router.use(authMiddleware.protect);

router.use(authMiddleware.restrictTo("company"));

router.patch("/:id/status", applicationController.updateApplicationStatus);

module.exports = router;
