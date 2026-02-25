const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Authentication = require('./models/Authentication'); //
const JobSeeker = require('./models/JobSeeker'); //

dotenv.config({ path: './.env' });

const mockSeekers = [
  {
    email: 'ahmed.software@example.com',
    fullName: 'Ahmed Mahmoud Ali',
    industry: 'Software Development', //
    experienceLevel: 'Senior-level',
    yearsOfExperience: 6,
    city: 'Cairo', country: 'Egypt', //
    jobTitle: 'Senior Full Stack Developer',
    degree: 'Bachelor of Computer Science',
    university: 'Cairo University',
    skills: ['React', 'Node.js', 'MongoDB', 'AWS', 'Docker']
  },
  {
    email: 'sara.data@example.com',
    fullName: 'Sara Hassan',
    industry: 'Data Science & Analytics', //
    experienceLevel: 'Mid-level',
    yearsOfExperience: 3,
    city: 'Dubai', country: 'United Arab Emirates', //
    jobTitle: 'Data Analyst',
    degree: 'Master in Data Analytics',
    university: 'American University in Dubai',
    skills: ['Python', 'SQL', 'PowerBI', 'Machine Learning']
  },
  {
    email: 'omar.cyber@example.com',
    fullName: 'Omar Khalid',
    industry: 'Cybersecurity', //
    experienceLevel: 'Senior-level',
    yearsOfExperience: 5,
    city: 'Riyadh', country: 'Saudi Arabia', //
    jobTitle: 'Penetration Tester',
    degree: 'B.Sc. in Information Security',
    university: 'King Saud University',
    skills: ['Ethical Hacking', 'Linux', 'Network Security', 'Python']
  },
  {
    email: 'laila.web@example.com',
    fullName: 'Laila Yassin',
    industry: 'Web Development', //
    experienceLevel: 'Entry-level',
    yearsOfExperience: 1,
    city: 'Amman', country: 'Jordan', //
    jobTitle: 'Frontend Developer',
    degree: 'Computer Engineering',
    university: 'University of Jordan',
    skills: ['HTML5', 'CSS3', 'JavaScript', 'Tailwind CSS']
  },
  {
    email: 'm.zaki@example.com',
    fullName: 'Mohamed Zaki',
    industry: 'AI & Machine Learning', //
    experienceLevel: 'Mid-level',
    yearsOfExperience: 4,
    city: 'Alexandria', country: 'Egypt', //
    jobTitle: 'AI Research Engineer',
    degree: 'Bachelor of IT',
    university: 'Alexandria University',
    skills: ['TensorFlow', 'PyTorch', 'Computer Vision', 'FastAPI']
  }
];

const seedSeekers = async () => {
  try {
    const DB_URI = process.env.DATABASE_URL || process.env.MONGO_URI;
    await mongoose.connect(DB_URI);
    console.log('✅ Connected to Database.');

    // 1. حذف طالبي العمل القدامى فقط (دون لمس الشركات أو الأدمن)
    console.log('🗑️ Cleaning old Job Seekers...');
    const oldSeekers = await JobSeeker.find({});
    const authIdsToDelete = oldSeekers.map(s => s.authId);
    
    await Authentication.deleteMany({ _id: { $in: authIdsToDelete }, accountType: 'job_seeker' }); //
    await JobSeeker.deleteMany({});
    console.log('✅ Old seekers deleted.');

    // 2. إنشاء الحسابات الجديدة
    console.log('🌱 Planting 5 high-quality seekers...');
    for (const s of mockSeekers) {
      const auth = await Authentication.create({
        email: s.email,
        password: 'Password@123',
        accountType: 'job_seeker', //
        isVerified: true,
        registrationStep: 4 //
      });

      await JobSeeker.create({
        authId: auth._id,
        fullName: s.fullName,
        industry: s.industry,
        experienceLevel: s.experienceLevel,
        yearsOfExperience: s.yearsOfExperience,
        city: s.city,
        country: s.country,
        location: `${s.city}, ${s.country}`, //
        jobTitle: s.jobTitle,
        degree: s.degree,
        university: s.university,
        phoneNumber: '+20123456789',
        gender: 'male', // بيانات افتراضية للتجربة
        summary: `Highly motivated professional in ${s.industry} with expertise in ${s.skills.join(', ')}.`,
        skills: s.skills
      });
    }

    console.log('🎉 Successfully created 5 premium seekers!');
    console.log('🔐 Login using their emails with password: Password@123');
    process.exit();

  } catch (error) {
    console.error('❌ Seeding Error:', error);
    process.exit(1);
  }
};

seedSeekers();