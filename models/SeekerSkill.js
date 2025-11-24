const mongoose = require("mongoose");

const seekerSkillSchema = new mongoose.Schema(
  {
    seekerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobSeeker",
      required: [true, "Job Seeker ID is required"],
    },
    skillId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Skill",
      required: [true, "Skill ID is required"],
    },
    proficiency: {
      type: String,
      enum: ["beginner", "intermediate", "advanced", "expert"],
      default: "intermediate",
    },
    yearsOfExperience: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate skills for the same user (Composite Key)
seekerSkillSchema.index({ seekerId: 1, skillId: 1 }, { unique: true });

const SeekerSkill = mongoose.model("SeekerSkill", seekerSkillSchema);

module.exports = SeekerSkill;
