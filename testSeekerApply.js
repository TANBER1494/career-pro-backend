const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Authentication = require("./models/Authentication");
const JobSeeker = require("./models/JobSeeker");
const Company = require("./models/Company");
const Job = require("./models/Job");
const JobApplication = require("./models/JobApplication");

dotenv.config({ path: "./.env" });

mongoose
  .connect(process.env.DATABASE_URL)
  .then(() => console.log("DB Connection Successful!"))
  .catch((err) => console.log("DB Error:", err));

const testApplyFlow = async () => {
  try {
    // 1. Setup: Company & Job
    const compAuth = await Authentication.create({
      email: "comp_apply@test.com",
      password: "password123", // ✅ Corrected: > 8 chars
      accountType: "company",
    });

    const company = await Company.create({
      authId: compAuth._id,
      companyName: "Apply Corp",
      companySize: "100+",
    });

    const job = await Job.create({
      companyId: company._id,
      title: "Node Dev",
      location: "Remote",
      type: "Full-time",
      experienceLevel: "Mid-level",
      description: "Backend job...",
      status: "published",
    });

    // 2. Setup: Job Seeker
    const seekerAuth = await Authentication.create({
      email: "seeker_apply@test.com",
      password: "password123", // ✅ Corrected: > 8 chars
      accountType: "job_seeker",
    });

    const seeker = await JobSeeker.create({
      authId: seekerAuth._id,
      fullName: "Apply Tester",
    });

    console.log("1. Environment Ready (Job & Seeker).");

    // 3. Simulate Apply Logic (What Controller Does)
    // A. Find Seeker Profile from Auth ID
    const profile = await JobSeeker.findOne({ authId: seekerAuth._id });

    // B. Create Application
    const app = await JobApplication.create({
      jobId: job._id,
      seekerId: profile._id,
      resumeUrl: "/uploads/cvs/test_cv.pdf",
      coverLetter: "Hire me please!",
      status: "submitted",
    });

    console.log("2. Application Created Successfully:", app._id);

    // 4. Verify Retrieval (My Applications)
    const myApps = await JobApplication.find({
      seekerId: profile._id,
    }).populate("jobId");
    console.log("3. My Applications Count:", myApps.length);
    console.log("   - Job Title:", myApps[0].jobId.title);

    // Cleanup
    await JobApplication.deleteMany({});
    await Job.deleteMany({});
    await JobSeeker.deleteMany({});
    await Company.deleteMany({});
    await Authentication.deleteMany({
      _id: { $in: [compAuth._id, seekerAuth._id] },
    });

    console.log("4. Cleanup complete.");
    process.exit();
  } catch (err) {
    console.error("Error:", err.message); // Print only message to be cleaner
    process.exit(1);
  }
};

testApplyFlow();
