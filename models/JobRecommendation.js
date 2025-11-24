const mongoose = require("mongoose");

const jobRecommendationSchema = new mongoose.Schema(
  {
    // Which user is getting this recommendation?
    seekerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobSeeker",
      required: [true, "Job Seeker ID is required"],
    },
    // Which job is being recommended?
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: [true, "Job ID is required"],
    },
    // Link to the specific AI request that generated this (for tracking/debugging)
    analysisRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AiAnalysisRequest",
      // Not strictly required, but good for audit trails
    },

    // Recommendation Details
    matchPercentage: {
      type: Number,
      required: [true, "Match percentage is required"],
      min: 0,
      max: 100,
    },
    // Why was this job recommended? (AI Explanation)
    explanations: {
      type: Map, // Flexible JSON structure
      of: String,
    },
    recommendationSource: {
      type: String,
      enum: ["ai_job_matching", "skill_assessment", "cv_analyzer", "combined"],
      required: [true, "Source is required"],
    },

    isViewed: {
      type: Boolean,
      default: false,
    },
    recommendationDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index to quickly find top matches for a user
// Compound index: Find recommendations for a user, sorted by match score (descending)
jobRecommendationSchema.index({ seekerId: 1, matchPercentage: -1 });

const JobRecommendation = mongoose.model(
  "JobRecommendation",
  jobRecommendationSchema
);

module.exports = JobRecommendation;
