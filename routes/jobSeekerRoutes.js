const express = require('express');
const jobSeekerController = require('../controllers/jobSeekerController');
const upload = require('../utils/fileUpload');
const authMiddleware = require('../middlewares/authMiddleware');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const authController = require('../controllers/authController');
const jobMatchingController = require('../controllers/jobMatchingController');

router.use(authMiddleware.protect);
router.use(authMiddleware.restrictTo('job_seeker'));

// --- Profile Routes ---
router.get('/me', jobSeekerController.getMe);
router.patch('/profile/step1', jobSeekerController.updateProfileStep1);
router.patch('/profile/step2', jobSeekerController.updateProfileStep2);
router.post(
  '/profile/step3',
  upload.single('cvFile'),
  jobSeekerController.uploadCV
);

router.post(
  '/profile/upload-photo',
  upload.single('profileImage'), // لازم الاسم ده يطابق الـ FormData في الفرونت
  jobSeekerController.uploadProfilePicture
);

router.get('/profile', jobSeekerController.getMe);
// GET /api/v1/job-seeker/applications
router.get('/saved-jobs', jobSeekerController.getSavedJobs);
router.get('/applications', applicationController.getSeekerApplications);
router.delete('/applications/:appId', jobSeekerController.deleteApplication);


// مسار الـ AI Matching (محمي أوتوماتيكياً بصلاحيات طالب العمل من أعلى الملف)
router.get(
  '/ai-matches',
  jobMatchingController.generateMatches
);
module.exports = router;
