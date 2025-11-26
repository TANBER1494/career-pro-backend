const express = require("express");
const authController = require("../controllers/authController");
const adminController = require("../controllers/adminController");

const router = express.Router();

// Protect all routes below (Must be Logged In + Must be Admin)
router.use(authController.protect);
router.use(authController.restrictTo("admin"));

router.get("/verification-requests", adminController.getVerificationRequests);
router.patch(
  "/verify-company/:documentId",
  adminController.reviewCompanyVerification
);

module.exports = router;
