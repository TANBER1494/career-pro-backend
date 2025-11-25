const express = require("express");
const authController = require("../controllers/authController");

const router = express.Router();

router.post("/signup", authController.signup);
router.post("/login", authController.login);

// Test Protected Route
router.get("/test-protect", authController.protect, (req, res) => {
  res.status(200).json({
    status: "success",
    message: "You are authorized!",
    user: req.user,
  });
});

module.exports = router;
