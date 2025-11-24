const mongoose = require("mongoose");

const userSessionSchema = new mongoose.Schema(
  {
    authId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Authentication",
      required: [true, "Auth ID is required for the session"],
    },
    loginTime: {
      type: Date,
      default: Date.now,
    },
    logoutTime: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    ipAddress: {
      type: String,
      required: [true, "IP Address is required"],
    },
    userAgent: {
      type: String, // Stores browser/device info
      required: [true, "User Agent is required"],
    },
    expiresAt: {
      type: Date,
      required: [true, "Session expiration date is required"],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
userSessionSchema.index({ authId: 1 });

// TTL Index: Automatically delete session from DB after 'expiresAt' time passed
userSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const UserSession = mongoose.model("UserSession", userSessionSchema);

module.exports = UserSession;
