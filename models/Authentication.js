const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");

const authenticationSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Please provide your email"],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: [true, "Please provide a password"],
      minlength: 8,
      select: false, // Hide password from query results
    },
    accountType: {
      type: String,
      enum: ["job_seeker", "company", "admin"],
      required: [true, "Please provide account type"],
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
      select: false,
    },
    lastLogin: Date,
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// Middleware: Hash password before saving
authenticationSchema.pre("save", async function () {
  // Only run this function if password was actually modified
  if (!this.isModified("password")) return;

  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);
});

// Method: Compare candidate password with user password
authenticationSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

const Authentication = mongoose.model("Authentication", authenticationSchema);

module.exports = Authentication;
