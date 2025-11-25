const mongoose = require("mongoose");

const jobSeekerSchema = new mongoose.Schema(
  {
    // Link to Authentication Table (One-to-One Relationship)
    authId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Authentication",
      required: [true, "Auth ID is required"],
      unique: true, // Ensures one profile per user
    },

    savedJobs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Job",
      },
    ],

    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },
    jobTitle: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    // Educational Info
    degree: String,
    university: String,
    graduationYear: Number,

    // Personal Info
    birthDate: Date,
    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },

    // Professional Details
    yearsOfExperience: {
      type: Number,
      default: 0,
    },
    industry: String,

    // Work Preferences
    workType: {
      type: String,
      enum: ["Full Time", "Part Time", "Contract", "Internship"],
    },
    workPlace: {
      type: String,
      enum: ["remote", "on_site", "hybrid"],
    },

    // AI Generated Data (Flexible JSON)
    personalityProfile: {
      type: Map, // Using Map for flexible JSON data
      of: String, // Or Mixed if structure varies greatly
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// Index for faster search by location or job title
jobSeekerSchema.index({ location: 1 });
jobSeekerSchema.index({ jobTitle: 1 });

const JobSeeker = mongoose.model("JobSeeker", jobSeekerSchema);

module.exports = JobSeeker;
