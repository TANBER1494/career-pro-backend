const mongoose = require("mongoose");

const aiAnalysisRequestSchema = new mongoose.Schema(
  {
    seekerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobSeeker",
      required: [true, "Job Seeker ID is required"],
    },

    // Optional References: A request can be for a CV or a Personality Test
    personalityTestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PersonalityTest",
    },
    cvUploadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CvUpload",
    },

    // Request Lifecycle
    requestStatus: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
    },

    // Data Payload (What we sent to AI)
    requestData: {
      type: Map,
      of: mongoose.Schema.Types.Mixed, // Flexible JSON
    },

    // AI Response (What AI sent back)
    responseData: {
      type: Map,
      of: mongoose.Schema.Types.Mixed, // Flexible JSON
    },

    processedAt: Date,
  },
  {
    timestamps: true, // createdAt is important for logging
  }
);

// Indexes for monitoring and debugging
aiAnalysisRequestSchema.index({ requestStatus: 1 });
aiAnalysisRequestSchema.index({ seekerId: 1, createdAt: -1 });

const AiAnalysisRequest = mongoose.model(
  "AiAnalysisRequest",
  aiAnalysisRequestSchema
);

module.exports = AiAnalysisRequest;
