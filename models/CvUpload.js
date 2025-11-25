const mongoose = require("mongoose");

const cvUploadSchema = new mongoose.Schema(
  {
    seekerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobSeeker",
      required: [true, "Job Seeker ID is required"],
    },

    // File Metadata
    fileName: {
      type: String,
      required: [true, "File name is required"],
      trim: true,
    },
    filePath: {
      type: String,
      required: [true, "File path is required"],
    },
    fileType: {
      type: String,
      enum: ["pdf", "doc", "docx"],
      required: [true, "File type is required"],
    },
    fileSize: {
      type: Number, // Size in bytes
      required: [true, "File size is required"],
    },

    // Optional: Job Description for tailored analysis
    // (User can paste a JD to compare their CV against it)
    jobDescriptionInput: {
      type: String,
      trim: true,
    },

    // Status Tracking
    uploadStatus: {
      type: String,
      enum: ["uploaded", "analyzing", "analyzed", "error"],
      default: "uploaded",
    },
    analysisStatus: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },

    // AI Analysis Results (Stored as flexible JSON)
    analysisScores: {
      type: Map, // e.g., { "structure": 80, "keywords": 90 }
      of: Number,
    },
    atsScore: {
      type: Number,
      min: 0,
      max: 100,
    },

    strengths: [String],

    improvementSuggestions: [String],

    keywordAnalysis: {
      present: [String],
      missing: [String],
    },
    analyzedAt: Date,
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// Indexes for performance
cvUploadSchema.index({ seekerId: 1, createdAt: -1 }); // Get latest CVs
cvUploadSchema.index({ analysisStatus: 1 }); // Find pending analyses

const CvUpload = mongoose.model("CvUpload", cvUploadSchema);

module.exports = CvUpload;
