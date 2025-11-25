const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    // Link to Company (Many-to-One)
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: [true, "Job must belong to a company"],
    },

    // Basic Info
    title: {
      type: String,
      required: [true, "Job title is required"],
      trim: true,
    },
    location: {
      type: String,
      required: [true, "Job location is required"],
      trim: true,
    },

    // Job Classification
    type: {
      type: String,
      enum: ["Full-time", "Part-time", "Contract", "Internship"],
      required: [true, "Job type is required"],
    },
    workPlace: {
      type: String,
      enum: ["remote", "on_site", "hybrid"],
      default: "on_site",
    },
    experienceLevel: {
      type: String,
      enum: ["Entry-level", "Mid-level", "Senior-level", "Executive"],
      required: [true, "Experience level is required"],
    },

    // Job Details
    description: {
      type: String,
      required: [true, "Job description is required"],
    },
    requirements: String,
    benefits: String,

    // Salary Range
    salaryMin: Number,
    salaryMax: Number,
    currency: {
      type: String,
      default: "USD",
    },

    // Skills (Array of Strings for efficient searching/display)
    skills: [String],

    // Status Management
    status: {
      type: String,
      enum: ["draft", "published", "closed", "archived"],
      default: "published",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    postedDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for search performance
jobSchema.index({ title: "text", description: "text" });
jobSchema.index({ location: 1 });
jobSchema.index({ type: 1 });
jobSchema.index({ status: 1 });

const Job = mongoose.model("Job", jobSchema);

module.exports = Job;
