const express = require("express");
const adminController = require("../controllers/adminController");
const authMiddleware = require("../middlewares/authMiddleware");
const router = express.Router();

// Protect all routes below (Must be Logged In + Must be Admin)
router.use(authMiddleware.protect);
router.use(authMiddleware.restrictTo("admin"));

router.get("/verification-requests", adminController.getVerificationRequests);
router.patch(
  "/verify-company/:documentId",
  adminController.reviewCompanyVerification
);

module.exports = router;
