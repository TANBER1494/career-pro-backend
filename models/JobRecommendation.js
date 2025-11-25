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
    // Link to the specific AI request (Optional)
    analysisRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AiAnalysisRequest",
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
      type: Map, // Flexible JSON structure for AI reasoning
      of: String,
    },
    // Updated Enums based on AI team agreement
    recommendationSource: {
      type: String,
      enum: ["profile_matching", "cv_matching"],
      required: [true, "Recommendation source is required"],
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

// Compound index: Find recommendations for a user, sorted by match score
jobRecommendationSchema.index({ seekerId: 1, matchPercentage: -1 });

const JobRecommendation = mongoose.model(
  "JobRecommendation",
  jobRecommendationSchema
);

module.exports = JobRecommendation;
