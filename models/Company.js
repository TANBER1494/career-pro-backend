const mongoose = require("mongoose");

const companySchema = new mongoose.Schema(
  {
    // Link to Authentication Table (One-to-One Relationship)
    authId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Authentication",
      required: [true, "Auth ID is required"],
      unique: true,
    },
    companyName: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
    },
    // Company Details
    industry: {
      type: String,
      trim: true,
    },
    companySize: {
      type: String,
      enum: ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"],
      required: [true, "Company size is required"],
    },
    location: {
      type: String,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    foundedYear: Number,
    companyDescription: String,
    logoUrl: String,

    // Verification System
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationStatus: {
      type: String,
      enum: ["unverified", "in_progress", "verified", "rejected"],
      default: "unverified",
    },
    verificationProgress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster search by name or industry
companySchema.index({ companyName: 1 });
companySchema.index({ industry: 1 });
companySchema.index({ isVerified: 1 });

const Company = mongoose.model("Company", companySchema);

module.exports = Company;
