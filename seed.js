const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Import All 15 Models
const Authentication = require("./models/Authentication");
const AuthToken = require("./models/AuthToken");
const UserSession = require("./models/UserSession");
const JobSeeker = require("./models/JobSeeker");
const Company = require("./models/Company");
const Skill = require("./models/Skill");
const Job = require("./models/Job");
const JobSkill = require("./models/JobSkill");
const SeekerSkill = require("./models/SeekerSkill");
const JobApplication = require("./models/JobApplication");
const JobRecommendation = require("./models/JobRecommendation");
const CompanyVerificationDocument = require("./models/CompanyVerificationDocument");
const CvUpload = require("./models/CvUpload");
const PersonalityTest = require("./models/PersonalityTest");
const AiAnalysisRequest = require("./models/AiAnalysisRequest");

dotenv.config({ path: "./.env" });

mongoose
  .connect(process.env.DATABASE_URL)
  .then(() => console.log("✅ DB Connection Successful!"))
  .catch((err) => console.log("❌ DB Error:", err));

const seedDatabase = async () => {
  try {
    // 1. CLEANUP: Delete ALL existing data from all 15 tables
    await Promise.all([
      Authentication.deleteMany(),
      AuthToken.deleteMany(),
      UserSession.deleteMany(),
      JobSeeker.deleteMany(),
      Company.deleteMany(),
      Skill.deleteMany(),
      Job.deleteMany(),
      JobSkill.deleteMany(),
      SeekerSkill.deleteMany(),
      JobApplication.deleteMany(),
      JobRecommendation.deleteMany(),
      CompanyVerificationDocument.deleteMany(),
      CvUpload.deleteMany(),
      PersonalityTest.deleteMany(),
      AiAnalysisRequest.deleteMany(),
    ]);
    console.log("🧹 Database Cleaned (All 15 tables cleared).");

    // 2. CREATE USERS (Auth)
    const [adminAuth, companyAuth, seekerAuth] = await Promise.all([
      Authentication.create({
        email: "admin@test.com",
        password: "password123",
        accountType: "admin",
        isVerified: true,
      }),
      Authentication.create({
        email: "company@test.com",
        password: "password123",
        accountType: "company",
        isVerified: true,
      }),
      Authentication.create({
        email: "seeker@test.com",
        password: "password123",
        accountType: "job_seeker",
        isVerified: true,
      }),
    ]);
    console.log("👤 Auth Users Created.");

    // 3. CREATE PROFILES
    const company = await Company.create({
      authId: companyAuth._id,
      companyName: "Tech Corp",
      companySize: "201-500",
      industry: "Software",
      location: "Cairo",
    });

    const seeker = await JobSeeker.create({
      authId: seekerAuth._id,
      fullName: "Ahmed Ali",
      jobTitle: "Frontend Developer",
      location: "Alexandria",
      yearsOfExperience: 3,
    });
    console.log("📂 Profiles Created.");

    // 4. CREATE SKILLS & ASSIGN
    const reactSkill = await Skill.create({
      name: "React.js",
      category: "technical",
    });

    await SeekerSkill.create({
      seekerId: seeker._id,
      skillId: reactSkill._id,
      proficiency: "advanced",
      yearsOfExperience: 3,
    });
    console.log("🧠 Skills Created & Assigned.");

    // 5. CREATE JOB & APPLICATION
    const job = await Job.create({
      companyId: company._id,
      title: "Senior React Dev",
      location: "Remote",
      type: "Full-time",
      experienceLevel: "Senior-level",
      description: "We need a React expert...",
      salaryMin: 50000,
      salaryMax: 80000,
      skills: ["React.js"],
    });

    await JobSkill.create({
      jobId: job._id,
      skillId: reactSkill._id,
      requiredProficiency: "expert",
    });
    console.log("💼 Job Posted & Skills Linked.");

    await JobApplication.create({
      jobId: job._id,
      seekerId: seeker._id,
      resumeUrl: "/uploads/cvs/ahmed.pdf",
      status: "submitted",
    });
    console.log("📝 Job Application Submitted.");

    // 6. CREATE AI & FILE DATA
    // A. CV Upload
    const cv = await CvUpload.create({
      seekerId: seeker._id,
      fileName: "ahmed_cv.pdf",
      filePath: "/uploads/ahmed_cv.pdf",
      fileType: "pdf",
      fileSize: 1024,
      uploadStatus: "analyzed",
      analysisStatus: "completed",
      overallScore: 88,
    });

    // B. Personality Test
    const test = await PersonalityTest.create({
      seekerId: seeker._id,
      testStatus: "completed",
      personalityTypeCode: "INTJ",
      userAnswers: { q1: 5, q2: "yes" },
    });

    // C. AI Request Log
    await AiAnalysisRequest.create({
      seekerId: seeker._id,
      cvUploadId: cv._id,
      requestStatus: "completed",
      requestData: { action: "analyze_cv" },
      responseData: { score: 88 },
    });

    // D. Job Recommendation
    await JobRecommendation.create({
      seekerId: seeker._id,
      jobId: job._id,
      matchPercentage: 95,
      recommendationSource: "cv_matching",
    });
    console.log(
      "🤖 AI System Data Seeded (CV, Test, Requests, Recommendations)."
    );

    // 9. COMPANY VERIFICATION DOC (THIS WAS MISSING BEFORE)
    // This creates a 'pending' document for the Admin to review
    await CompanyVerificationDocument.create({
      companyId: company._id,
      documentType: "tax_certificate",
      fileName: "tax.pdf",
      filePath: "/uploads/docs/tax.pdf",
      fileSize: 5000,
      verificationStatus: "pending",
    });
    console.log("📄 Verification Document Uploaded (Pending Review).");

    console.log("✅✅ FINAL SYSTEM CHECK PASSED! DB IS READY. ✅✅");
    process.exit();
  } catch (err) {
    console.error("❌ Seeding Error:", err.message);
    process.exit(1);
  }
};

seedDatabase();
