const mongoose = require("mongoose");

const authTokenSchema = new mongoose.Schema(
  {
    authId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Authentication", // Reference to the parent User
      required: [true, "Auth ID is required"],
    },
    token: {
      type: String,
      required: [true, "Token string is required"],
      unique: true,
    },
    tokenType: {
      type: String,
      enum: {
        values: ["password_reset", "email_verification"],
        message: "Token type must be: password_reset or email_verification",
      },
      required: [true, "Token type is required"],
    },
    expiresAt: {
      type: Date,
      required: [true, "Expiration date is required"],
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance optimization
authTokenSchema.index({ expiresAt: 1 });

const AuthToken = mongoose.model("AuthToken", authTokenSchema);

module.exports = AuthToken;
