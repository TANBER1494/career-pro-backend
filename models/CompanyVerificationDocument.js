const mongoose = require("mongoose");

const companyVerificationDocumentSchema = new mongoose.Schema(
  {
    // Link to Company (Many-to-One)
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: [true, "Company ID is required"],
    },

    // Document Details
    documentType: {
      type: String,
      enum: [
        "business_registration_certificate",
        "tax_certificate",
        "company_profile_document",
      ],
      required: [true, "Document type is required"],
    },
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
      enum: ["pdf", "jpg", "png", "doc", "docx"],
      default: "pdf",
    },
    fileSize: {
      type: Number, // Size in bytes
      required: [true, "File size is required"],
    },

    // Verification Workflow Status
    verificationStatus: {
      type: String,
      enum: ["pending", "under_review", "approved", "rejected"],
      default: "pending",
    },
    rejectionReason: {
      type: String,
      trim: true,
    },

    // Review Details
    reviewedAt: Date,
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Authentication", // Link to the Admin who reviewed it
    },
  },
  {
    timestamps: { createdAt: "uploadedAt", updatedAt: "updatedAt" },
  }
);

// Index to find all documents for a specific company quickly
companyVerificationDocumentSchema.index({ companyId: 1 });
// Index to filter documents by status (e.g., find all pending requests)
companyVerificationDocumentSchema.index({ verificationStatus: 1 });

const CompanyVerificationDocument = mongoose.model(
  "CompanyVerificationDocument",
  companyVerificationDocumentSchema
);

module.exports = CompanyVerificationDocument;
