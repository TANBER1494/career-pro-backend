const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Authentication = require("./models/Authentication");
const JobSeeker = require("./models/JobSeeker");
const AiAnalysisRequest = require("./models/AiAnalysisRequest");

dotenv.config({ path: "./.env" });

mongoose
  .connect(process.env.DATABASE_URL)
  .then(() => console.log("DB connection successful!"))
  .catch((err) => console.log("DB Connection Error:", err));

const testAiFlow = async () => {
  try {
    // 1. Setup Seeker
    const authUser = await Authentication.create({
      email: "ai_logger@example.com",
      password: "password123",
      accountType: "job_seeker",
    });
    const seeker = await JobSeeker.create({
      authId: authUser._id,
      fullName: "Neo Anderson",
      jobTitle: "The One",
    });
    console.log("1. Seeker Created:", seeker.fullName);

    // 2. Create Analysis Request (Simulating sending data to AI)
    const request = await AiAnalysisRequest.create({
      seekerId: seeker._id,
      requestStatus: "pending",
      requestData: {
        action: "analyze_cv",
        file_path: "/uploads/cvs/matrix.pdf",
        parameters: { detailed: true },
      },
    });

    console.log("2. Request Created (Pending):");
    console.log({ id: request._id, status: request.requestStatus });

    // 3. Simulate AI Processing & Completion
    // Update to processing
    await AiAnalysisRequest.findByIdAndUpdate(request._id, {
      requestStatus: "processing",
    });

    // Simulate completion after 1 second
    const aiResponse = {
      success: true,
      score: 99,
      skills_detected: ["Kung Fu", "Hacking", "Flying"],
    };

    const completedRequest = await AiAnalysisRequest.findByIdAndUpdate(
      request._id,
      {
        requestStatus: "completed",
        responseData: aiResponse,
        processedAt: Date.now(),
      },
      { new: true }
    );

    console.log("3. Request Completed & Logged:");
    console.log({
      status: completedRequest.requestStatus,
      response: completedRequest.responseData,
      time: completedRequest.processedAt,
    });

    // Cleanup
    await AiAnalysisRequest.deleteOne({ _id: request._id });
    await JobSeeker.deleteOne({ _id: seeker._id });
    await Authentication.deleteOne({ _id: authUser._id });

    console.log("4. Cleanup complete.");
    process.exit();
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
};

testAiFlow();
