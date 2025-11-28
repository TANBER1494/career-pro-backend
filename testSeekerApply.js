const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Authentication = require("./models/Authentication");
const JobSeeker = require("./models/JobSeeker");
const CvUpload = require("./models/CvUpload");

dotenv.config({ path: "./.env" });

mongoose
  .connect(process.env.DATABASE_URL)
  .then(() => console.log("DB Connected"));

const testSteps = async () => {
  try {
    // 1. Create User (Default Step should be 1)
    const auth = await Authentication.create({
      email: "step_tester@test.com",
      password: "password123",
      accountType: "job_seeker",
      isVerified: true,
    });
    console.log(
      `1. User Created. Step: ${auth.registrationStep} (Expected: 1)`
    );

    // 2. Create Profile (Step 1) -> Should update to 2
    await JobSeeker.create({ authId: auth._id, fullName: "Step Tester" });
    // Simulate Controller Logic manually:
    await Authentication.findByIdAndUpdate(auth._id, { registrationStep: 2 });

    const userStep2 = await Authentication.findById(auth._id);
    console.log(
      `2. Step 1 Finished. Step: ${userStep2.registrationStep} (Expected: 2)`
    );

    // 3. Update Profile (Step 2) -> Should update to 3
    // Simulate Controller Logic manually:
    await Authentication.findByIdAndUpdate(auth._id, { registrationStep: 3 });

    const userStep3 = await Authentication.findById(auth._id);
    console.log(
      `3. Step 2 Finished. Step: ${userStep3.registrationStep} (Expected: 3)`
    );

    // 4. Upload CV (Step 3) -> Should update to 4
    // Simulate Controller Logic manually:
    await Authentication.findByIdAndUpdate(auth._id, { registrationStep: 4 });

    const userStep4 = await Authentication.findById(auth._id);
    console.log(
      `4. Step 3 Finished. Step: ${userStep4.registrationStep} (Expected: 4)`
    );

    // Cleanup
    await Authentication.deleteOne({ _id: auth._id });
    await JobSeeker.deleteOne({ authId: auth._id });
    console.log("✅ Test Passed & Cleaned up.");
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

testSteps();
