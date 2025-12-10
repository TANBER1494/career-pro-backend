const mongoose = require("mongoose");

const jobSeekerSchema = new mongoose.Schema(
  {
    // ربط المستخدم بجدول المصادقة (Auth)
    authId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Authentication",
      required: [true, "Auth ID is required"],
      unique: true,
    },

    // --- Basic Information ---
    fullName: {
      type: String,
      trim: true,
      default: "",
    },
    jobTitle: {
      type: String,
      trim: true,
      default: "",
    },
    summary: {
      type: String,
      trim: true, // Professional Summary / Bio
    },

    // --- Contact Info ---
    phone: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true, // يمكن استخدامه لتخزين "City, Country" مدمجة
    },

    // --- Personal Details ---
    birthDate: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer_not_to_say"],
      lowercase: true, // لضمان التوافق مع الفرونت إند (Male -> male)
    },

    // --- Career Details ---
    experienceLevel: {
      type: String, // e.g., "Mid-Level", "Senior", "Intern"
      trim: true,
    },
    yearsOfExperience: {
      type: Number,
      default: 0,
    },
    industry: {
      type: String,
      trim: true,
    },

    // --- Education ---
    degree: {
      type: String, // e.g., "Bachelor's", "Master's"
      trim: true,
    },
    university: {
      type: String,
      trim: true,
    },
    graduationYear: {
      type: Number,
    },
    gpa: {
      type: Number,
    },

    // --- Preferences ---
    workType: {
      type: String,
      // القيم المسموحة بناءً على القوائم في الفرونت إند
      // (Full Time, Part Time, Contract, Internship, etc.)
      trim: true,
    },
    workPlace: {
      type: String,
      // (On-Site, Remote, Hybrid)
      trim: true,
    },

    // --- Social Links ---
    linkedin: {
      type: String,
      trim: true,
    },
    personalWebsite: {
      type: String, // Portfolio
      trim: true,
    },

    // --- System / Features ---
    savedJobs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Job",
      },
    ],

    // حقل لتخزين نتائج تحليل الشخصية بالذكاء الاصطناعي مستقبلاً
    personalityProfile: {
      type: Map,
      of: String,
    },
  },
  {
    timestamps: true, // يضيف createdAt و updatedAt تلقائياً
  }
);

// إضافة Index للبحث السريع
jobSeekerSchema.index({ jobTitle: 1 });
jobSeekerSchema.index({ location: 1 });
jobSeekerSchema.index({ industry: 1 });

const JobSeeker = mongoose.model("JobSeeker", jobSeekerSchema);

module.exports = JobSeeker;
