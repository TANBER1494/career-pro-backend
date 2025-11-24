const mongoose = require("mongoose");

const jobSkillSchema = new mongoose.Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: [true, "Job ID is required"],
    },
    skillId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Skill",
      required: [true, "Skill ID is required"],
    },
    requiredProficiency: {
      type: String,
      enum: ["beginner", "intermediate", "advanced", "expert"],
      required: [true, "Proficiency level is required"],
    },
  },
  {
    timestamps: true,
  }
);

// Prevent adding the same skill to the same job multiple times
jobSkillSchema.index({ jobId: 1, skillId: 1 }, { unique: true });

const JobSkill = mongoose.model("JobSkill", jobSkillSchema);

module.exports = JobSkill;
