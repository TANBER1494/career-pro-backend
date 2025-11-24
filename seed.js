const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Import All Models
const Authentication = require("./models/Authentication");
const AuthToken = require("./models/AuthToken");
const UserSession = require("./models/UserSession");
const JobSeeker = require("./models/JobSeeker");
const Company = require("./models/Company");
const Skill = require("./models/Skill");
const Job = require("./models/Job");
const JobSkill = require("./models/JobSkill");
const SeekerSkill = require("./models/SeekerSkill"); // ✅ Added
const JobApplication = require("./models/JobApplication");
const JobRecommendation = require("./models/JobRecommendation");
const CompanyVerificationDocument = require("./models/CompanyVerificationDocument");

dotenv.config({ path: "./.env" });

mongoose
  .connect(process.env.DATABASE_URL)
  .then(() => console.log("✅ DB Connection Successful!"))
  .catch((err) => console.log("❌ DB Error:", err));

const seedDatabase = async () => {
  try {
    // 1. CLEANUP: Delete ALL existing data
    await Promise.all([
      Authentication.deleteMany(),
      AuthToken.deleteMany(),
      UserSession.deleteMany(),
      JobSeeker.deleteMany(),
      Company.deleteMany(),
      Skill.deleteMany(),
      Job.deleteMany(),
      JobSkill.deleteMany(),
      SeekerSkill.deleteMany(), // ✅ Added cleanup
      JobApplication.deleteMany(),
      JobRecommendation.deleteMany(),
      CompanyVerificationDocument.deleteMany(),
    ]);
    console.log("🧹 Database Cleaned.");

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

    // 4. CREATE SKILLS
    const [reactSkill, nodeSkill] = await Promise.all([
      Skill.create({ name: "React.js", category: "technical" }),
      Skill.create({ name: "Node.js", category: "technical" }),
    ]);
    console.log("🧠 Skills Created.");

    // 5. ASSIGN SKILLS TO SEEKER (✅ NEW STEP)
    await SeekerSkill.create({
      seekerId: seeker._id,
      skillId: reactSkill._id,
      proficiency: "advanced",
      yearsOfExperience: 3,
    });
    console.log("🧑‍💻 Seeker Skills Assigned.");

    // 6. CREATE JOB & LINK SKILLS
    const job = await Job.create({
      companyId: company._id,
      title: "Senior React Dev",
      location: "Remote",
      type: "Full-time",
      experienceLevel: "Senior-level",
      description: "We need a React expert...",
      salaryMin: 50000,
      salaryMax: 80000,
      skills: ["React.js"], // For display/search
    });

    await JobSkill.create({
      jobId: job._id,
      skillId: reactSkill._id,
      requiredProficiency: "expert",
    });
    console.log("💼 Job Posted & Skills Linked.");

    // 7. CREATE APPLICATION
    await JobApplication.create({
      jobId: job._id,
      seekerId: seeker._id,
      resumeUrl: "/uploads/cvs/ahmed.pdf",
      status: "submitted",
    });
    console.log("📝 Job Application Submitted.");

    // 8. CREATE RECOMMENDATION
    await JobRecommendation.create({
      seekerId: seeker._id,
      jobId: job._id,
      matchPercentage: 92,
      recommendationSource: "ai_job_matching",
    });
    console.log("🤖 Recommendation Generated.");

    // 9. COMPANY VERIFICATION DOC
    await CompanyVerificationDocument.create({
      companyId: company._id,
      documentType: "tax_certificate",
      fileName: "tax.pdf",
      filePath: "/docs/tax.pdf",
      fileSize: 5000,
      verificationStatus: "pending",
    });
    console.log("wd Document Uploaded.");

    console.log("✅FULL SYSTEM SEED COMPLETED SUCCESSFULLY!");
    process.exit();
  } catch (err) {
    console.error("❌ Seeding Error:", err.message);
    process.exit(1);
  }
};

seedDatabase();
