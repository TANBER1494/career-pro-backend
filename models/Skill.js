const mongoose = require("mongoose");

const skillSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Skill name is required"],
      unique: true, // Prevent duplicates like "Python" and "python"
      trim: true,
      lowercase: true,
    },
    category: {
      type: String,
      enum: ["technical", "soft", "ai", "technology", "other"],
      default: "technical",
    },
  },
  {
    timestamps: true,
  }
);

const Skill = mongoose.model("Skill", skillSchema);

module.exports = Skill;
