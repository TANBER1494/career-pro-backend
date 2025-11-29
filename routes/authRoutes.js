const express = require("express");
const authController = require("../controllers/authController");
const authMiddleware = require("../middlewares/authMiddleware");
const router = express.Router();

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/verify-email", authController.verifyEmail);
router.post("/resend-code", authController.resendVerificationCode);

// Test Protected Route
router.get("/test-protect", authMiddleware.protect, (req, res) => {
  res.status(200).json({
    status: "success",
    message: "You are authorized!",
    user: req.user,
  });
});

router.use(authMiddleware.protect);
router.get("/me", authController.getMe);

module.exports = router;
