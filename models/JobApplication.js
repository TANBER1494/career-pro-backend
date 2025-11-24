const mongoose = require("mongoose");

const jobApplicationSchema = new mongoose.Schema(
  {
    // Relationship: Which job is this application for?
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: [true, "Job ID is required"],
    },
    // Relationship: Who is applying?
    seekerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobSeeker",
      required: [true, "Job Seeker ID is required"],
    },

    // Application Details
    status: {
      type: String,
      enum: [
        "submitted",
        "under_review",
        "interview_scheduled",
        "rejected",
        "accepted",
      ],
      default: "submitted",
    },
    coverLetter: {
      type: String,
      trim: true,
    },
    // Snapshot of the CV used for this specific application
    resumeUrl: {
      type: String,
      required: [true, "Resume URL is required"],
    },

    appliedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

// Prevent duplicate applications: A seeker can apply to a specific job only once.
jobApplicationSchema.index({ jobId: 1, seekerId: 1 }, { unique: true });

const JobApplication = mongoose.model("JobApplication", jobApplicationSchema);

module.exports = JobApplication;
