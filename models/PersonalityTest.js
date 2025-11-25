const mongoose = require("mongoose");

const personalityTestSchema = new mongoose.Schema(
  {
    seekerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobSeeker",
      required: [true, "Job Seeker ID is required"],
    },

    // The final result code (e.g., "INTJ", "Ocean-High-Openness")
    personalityTypeCode: {
      type: String,
      trim: true,
      uppercase: true,
    },

    testStatus: {
      type: String,
      enum: ["started", "in_progress", "completed"],
      default: "started",
    },

    // Flexible JSON field to store QuestionID: Answer pairs
    userAnswers: {
      type: Map,
      of: mongoose.Schema.Types.Mixed, // Allows numbers, strings, or booleans
    },

    // Flexible JSON field to store the raw output from the AI model before processing
    aiRawAnalysis: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },

    startTime: {
      type: Date,
      default: Date.now,
    },
    completionTime: Date,
  },
  {
    timestamps: true,
  }
);

// Index to quickly find a seeker's tests
personalityTestSchema.index({ seekerId: 1, createdAt: -1 });

const PersonalityTest = mongoose.model(
  "PersonalityTest",
  personalityTestSchema
);

module.exports = PersonalityTest;
