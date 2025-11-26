const express = require("express");
const authController = require("../controllers/authController");

const router = express.Router();

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/verify-email", authController.verifyEmail);

// Test Protected Route
router.get("/test-protect", authController.protect, (req, res) => {
  res.status(200).json({
    status: "success",
    message: "You are authorized!",
    user: req.user,
  });
});

router.use(authController.protect);
router.get("/me", authController.getMe);

module.exports = router;
