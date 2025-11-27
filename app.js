const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const AppError = require("./utils/AppError");
const globalErrorHandler = require("./controllers/errorController");

// Import Routes
const authRouter = require("./routes/authRoutes");
const jobSeekerRouter = require("./routes/jobSeekerRoutes");
const companyRouter = require("./routes/companyRoutes");
const adminRouter = require("./routes/adminRoutes");

// ✅ 1. استدعاء ملف الوظايف (ده اللي كان ناقص عشان التقديم يشتغل)
const jobRouter = require("./routes/jobRoutes");

// (ملحوظة: لو الملف ده مش موجود عندك أو بيعمل مشاكل، ممكن تعمل عليه كومنت مؤقتاً)
const applicationRouter = require("./routes/applicationRoutes");

const app = express();

// Middlewares
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}
app.use(cors());
app.use(express.json());

// Routes Mounting
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/job-seeker", jobSeekerRouter);
app.use("/api/v1/company", companyRouter);
app.use("/api/v1/admin", adminRouter);

// ✅ 2. تفعيل مسار الوظايف (عشان /api/v1/jobs/:id/apply تشتغل)
app.use("/api/v1/jobs", jobRouter);

app.use("/api/v1/applications", applicationRouter);

// 404 Handler
app.all(/(.*)/, (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Error Handler
app.use(globalErrorHandler);

module.exports = app;
