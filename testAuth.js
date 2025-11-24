const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Authentication = require("./models/Authentication");
const Company = require("./models/Company");
const CompanyVerificationDocument = require("./models/CompanyVerificationDocument");

dotenv.config({ path: "./.env" });

mongoose
  .connect(process.env.DATABASE_URL)
  .then(() => console.log("DB connection successful!"))
  .catch((err) => console.log("DB Connection Error:", err));

const testVerificationFlow = async () => {
  try {
    // 1. Setup: Create Company and Admin
    // A. Company
    const companyAuth = await Authentication.create({
      email: "company_verif@test.com",
      password: "password123",
      accountType: "company",
    });
    const company = await Company.create({
      authId: companyAuth._id,
      companyName: "Verif Me Please",
      companySize: "1-10",
    });

    // B. Admin
    const adminAuth = await Authentication.create({
      email: "admin@test.com",
      password: "password123",
      accountType: "admin",
    });

    console.log("1. Company & Admin Created.");

    // 2. Company uploads a document
    const doc = await CompanyVerificationDocument.create({
      companyId: company._id,
      documentType: "business_registration_certificate",
      fileName: "reg_cert.pdf",
      filePath: "/uploads/docs/reg_cert.pdf",
      fileType: "pdf",
      fileSize: 102400, // 100KB
    });

    console.log("2. Document Uploaded (Pending):", doc.verificationStatus);

    // 3. Admin reviews and approves the document
    doc.verificationStatus = "approved";
    doc.reviewedBy = adminAuth._id;
    doc.reviewedAt = Date.now();
    await doc.save();

    console.log("3. Document Reviewed & Approved:");
    console.log({
      docId: doc._id,
      status: doc.verificationStatus,
      reviewer: doc.reviewedBy,
      reviewedAt: doc.reviewedAt,
    });

    // Cleanup
    await CompanyVerificationDocument.deleteOne({ _id: doc._id });
    await Company.deleteOne({ _id: company._id });
    await Authentication.deleteMany({
      _id: { $in: [companyAuth._id, adminAuth._id] },
    });

    console.log("4. Cleanup complete.");
    process.exit();
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
};

testVerificationFlow();
