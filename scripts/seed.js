#!/usr/bin/env node
/**
 * Idempotent seed for the Job Portal.
 *
 * Running it twice never duplicates anything: every record is matched on a
 * natural key (email, slug, title + employer, job + seeker) and updated in
 * place. All seeded accounts share the password "Password123".
 */
import mongoose from "mongoose";

import { env } from "../src/config/env.js";
import Application from "../src/models/Application.js";
import Category from "../src/models/Category.js";
import Company from "../src/models/Company.js";
import District from "../src/models/District.js";
import Job from "../src/models/Job.js";
import Notification from "../src/models/Notification.js";
import SavedJob from "../src/models/SavedJob.js";
import User from "../src/models/User.js";
import { DISTRICTS, slugify } from "../src/utils/districts.js";
import { hashPassword } from "../src/utils/password.js";

const PASSWORD = "Password123";

const CATEGORIES = [
  { name: "Information Technology", icon: "laptop", order: 1 },
  { name: "Finance & Accounts", icon: "banknote", order: 2 },
  { name: "Healthcare & Nursing", icon: "stethoscope", order: 3 },
  { name: "Education & Teaching", icon: "graduation-cap", order: 4 },
  { name: "Engineering & Construction", icon: "hard-hat", order: 5 },
  { name: "Sales & Marketing", icon: "trending-up", order: 6 },
];

const ADMIN = {
  name: "System Administrator",
  email: "admin@jobportal.local",
  role: "admin",
  district: "Colombo",
};

const SEEKERS = [
  { name: "Nimal Perera", email: "nimal.perera@example.lk", district: "Colombo", phone: "0771234501" },
  { name: "Amali Fernando", email: "amali.fernando@example.lk", district: "Kandy", phone: "0771234502" },
  { name: "Ruwan Jayasinghe", email: "ruwan.jayasinghe@example.lk", district: "Galle", phone: "0771234503" },
  { name: "Hasini Wickramasinghe", email: "hasini.w@example.lk", district: "Kurunegala", phone: "0771234504" },
];

const EMPLOYERS = [
  {
    name: "Kasun Bandara",
    email: "hr@ceylonsolutions.lk",
    district: "Colombo",
    phone: "0112345678",
    company: {
      name: "Ceylon Solutions (Pvt) Ltd",
      industry: "Information Technology",
      address: "No 120, Galle Road, Colombo 03",
      website: "https://ceylonsolutions.lk",
      contactPerson: "Kasun Bandara",
    },
  },
  {
    name: "Dilani Silva",
    email: "hr@lankafinance.lk",
    district: "Colombo",
    phone: "0112345679",
    company: {
      name: "Lanka Finance PLC",
      industry: "Banking & Finance",
      address: "No 45, Janadhipathi Mawatha, Colombo 01",
      website: "https://lankafinance.lk",
      contactPerson: "Dilani Silva",
    },
  },
  {
    name: "Dr. Sunil Mapa",
    email: "hr@serendibhealth.lk",
    district: "Kandy",
    phone: "0812345670",
    company: {
      name: "Serendib Health Care",
      industry: "Healthcare",
      address: "No 8, Lake View Road, Kandy",
      website: "https://serendibhealth.lk",
      contactPerson: "Dr. Sunil Mapa",
    },
  },
  {
    name: "Kumari Dissanayake",
    email: "hr@sabaragamuwatrust.lk",
    district: "Kurunegala",
    phone: "0372345671",
    company: {
      name: "Sabaragamuwa Education Trust",
      industry: "Education",
      address: "No 22, Colombo Kurunegala Road, Kurunegala",
      website: "https://sabaragamuwatrust.lk",
      contactPerson: "Kumari Dissanayake",
    },
  },
  {
    name: "Tharindu Rajapaksa",
    email: "hr@lankainfra.lk",
    district: "Galle",
    phone: "0912345672",
    company: {
      name: "Lanka Infrastructure Engineering",
      industry: "Engineering & Construction",
      address: "No 15, Galle Road, Galle",
      website: "https://lankainfra.lk",
      contactPerson: "Tharindu Rajapaksa",
    },
  },
  {
    name: "Sanduni Herath",
    email: "hr@southernsales.lk",
    district: "Matara",
    phone: "0412345673",
    company: {
      name: "Southern Sales Group",
      industry: "Sales & Marketing",
      address: "No 64, Dharmapala Mawatha, Matara",
      website: "https://southernsales.lk",
      contactPerson: "Sanduni Herath",
    },
  },
];

const JOBS = [
  {
    title: "Senior Full Stack Developer",
    category: "Information Technology",
    description: "We are looking for a senior full stack developer to build and maintain our customer facing web products.",
    responsibilities: "Design, build and ship web features. Review code from the team. Own the release checklist.",
    qualifications: "BSc in Computer Science or equivalent. Five or more years with React and Node.js.",
    experienceRequired: "5+ years",
    experienceLevel: "senior",
    educationLevel: "bachelors",
    skills: ["React", "Node.js", "MongoDB", "AWS"],
    location: "Colombo 03",
    district: "Colombo",
    employmentType: "full-time",
    workMode: "hybrid",
    salaryMin: 350000,
    salaryMax: 550000,
    benefits: "Medical insurance, transport, annual bonus",
    vacancies: 2,
    status: "approved",
    isFeatured: true,
    employerIndex: 0,
  },
  {
    title: "Junior Frontend Developer",
    category: "Information Technology",
    description: "Join our frontend team and build accessible interfaces for a large Sri Lankan customer base.",
    responsibilities: "Turn designs into responsive components. Keep the bundle small and the pages quick.",
    qualifications: "Diploma or degree in IT. Familiar with HTML, CSS and modern JavaScript.",
    experienceRequired: "1+ year",
    experienceLevel: "entry",
    educationLevel: "diploma",
    skills: ["React", "TypeScript", "CSS"],
    location: "Colombo 03",
    district: "Colombo",
    employmentType: "full-time",
    workMode: "onsite",
    salaryMin: 120000,
    salaryMax: 200000,
    benefits: "Medical insurance, learning budget",
    vacancies: 3,
    status: "approved",
    isFeatured: true,
    employerIndex: 0,
  },
  {
    title: "Financial Accountant",
    category: "Finance & Accounts",
    description: "Prepare month end accounts, budgets and management reports for a growing finance team.",
    responsibilities: "Close the books each month. Prepare budgets and variance reports for management.",
    qualifications: "CA or ACCA qualified. Strong Excel and reporting skills.",
    experienceRequired: "3+ years",
    experienceLevel: "mid",
    educationLevel: "bachelors",
    skills: ["Accounting", "Excel", "SAP"],
    location: "Colombo 01",
    district: "Colombo",
    employmentType: "full-time",
    workMode: "onsite",
    salaryMin: 180000,
    salaryMax: 320000,
    benefits: "Medical insurance, performance bonus",
    vacancies: 1,
    status: "approved",
    isFeatured: false,
    employerIndex: 1,
  },
  {
    title: "Credit Risk Officer",
    category: "Finance & Accounts",
    description: "Assess lending proposals and manage the credit portfolio of the retail division.",
    responsibilities: "Evaluate loan proposals. Monitor an existing portfolio and flag early arrears.",
    qualifications: "Degree in Finance, Economics or Business. Two or more years in banking.",
    experienceRequired: "2+ years",
    experienceLevel: "mid",
    educationLevel: "bachelors",
    skills: ["Credit analysis", "Risk", "Excel"],
    location: "Colombo 01",
    district: "Colombo",
    employmentType: "full-time",
    workMode: "onsite",
    salaryMin: 150000,
    salaryMax: 250000,
    benefits: "Medical insurance",
    vacancies: 2,
    status: "approved",
    isFeatured: false,
    employerIndex: 1,
  },
  {
    title: "Registered Nurse",
    category: "Healthcare & Nursing",
    description: "Provide nursing care on a busy ward in our private hospital in Kandy.",
    responsibilities: "Deliver patient care and keep accurate nursing notes. Work with the medical team.",
    qualifications: "Registered nurse with the Nursing Council of Sri Lanka. One year ward experience.",
    experienceRequired: "1+ year",
    experienceLevel: "entry",
    educationLevel: "bachelors",
    skills: ["Nursing", "Patient care", "Emergency care"],
    location: "Kandy",
    district: "Kandy",
    employmentType: "full-time",
    workMode: "onsite",
    salaryMin: 90000,
    salaryMax: 140000,
    benefits: "Accommodation, medical insurance, overtime",
    vacancies: 5,
    status: "approved",
    isFeatured: true,
    employerIndex: 2,
  },
  {
    title: "Medical Laboratory Technician",
    category: "Healthcare & Nursing",
    description: "Run the laboratory diagnostics for our hospital and report results accurately.",
    responsibilities: "Process samples. Keep the lab equipment calibrated and the records complete.",
    qualifications: "Diploma in Medical Laboratory Technology. Two years of lab experience.",
    experienceRequired: "2+ years",
    experienceLevel: "mid",
    educationLevel: "diploma",
    skills: ["Laboratory", "Diagnostics", "Quality control"],
    location: "Kandy",
    district: "Kandy",
    employmentType: "full-time",
    workMode: "onsite",
    salaryMin: 80000,
    salaryMax: 130000,
    benefits: "Medical insurance, shuttle service",
    vacancies: 1,
    status: "approved",
    isFeatured: false,
    employerIndex: 2,
  },
  {
    title: "Secondary School Teacher (Mathematics)",
    category: "Education & Teaching",
    description: "Teach mathematics to grades 9 to 11 and prepare students for the national examinations.",
    responsibilities: "Plan and deliver lessons. Assess students and report progress to parents.",
    qualifications: "BSc in Education or a degree with a mathematics major. Teaching registration is an advantage.",
    experienceRequired: "2+ years",
    experienceLevel: "mid",
    educationLevel: "bachelors",
    skills: ["Mathematics", "Teaching", "Classroom management"],
    location: "Kurunegala",
    district: "Kurunegala",
    employmentType: "full-time",
    workMode: "onsite",
    salaryMin: 70000,
    salaryMax: 110000,
    benefits: "School holiday, medical insurance",
    vacancies: 2,
    status: "approved",
    isFeatured: false,
    employerIndex: 3,
  },
  {
    title: "Civil Site Engineer",
    category: "Engineering & Construction",
    description: "Supervise site works for our building projects along the southern coast.",
    responsibilities: "Supervise site works. Check quality and quantity against the drawings. Keep the site safe.",
    qualifications: "BSc in Civil Engineering. Professional membership with the Institution of Engineers Sri Lanka.",
    experienceRequired: "4+ years",
    experienceLevel: "senior",
    educationLevel: "bachelors",
    skills: ["Civil engineering", "AutoCAD", "Site supervision"],
    location: "Galle",
    district: "Galle",
    employmentType: "contract",
    workMode: "onsite",
    salaryMin: 200000,
    salaryMax: 340000,
    benefits: "Transport, accommodation allowance",
    vacancies: 2,
    status: "approved",
    isFeatured: true,
    employerIndex: 4,
  },
  {
    title: "Quantity Surveyor",
    category: "Engineering & Construction",
    description: "Cost control and estimation for our commercial building projects.",
    responsibilities: "Prepare estimates. Track project costs and certify payments to contractors.",
    qualifications: "Degree in Quantity Surveying. Two or more years in cost management.",
    experienceRequired: "2+ years",
    experienceLevel: "mid",
    educationLevel: "bachelors",
    skills: ["Quantity surveying", "Estimation", "Excel"],
    location: "Galle",
    district: "Galle",
    employmentType: "full-time",
    workMode: "hybrid",
    salaryMin: 140000,
    salaryMax: 230000,
    benefits: "Medical insurance, transport",
    vacancies: 1,
    status: "approved",
    isFeatured: false,
    employerIndex: 4,
  },
  {
    title: "Business Development Executive",
    category: "Sales & Marketing",
    description: "Grow our dealer network across the southern province.",
    responsibilities: "Visit dealers and onboard new ones. Plan and run regional promotions.",
    qualifications: "Degree in Marketing or Business. Willingness to travel within the province.",
    experienceRequired: "3+ years",
    experienceLevel: "mid",
    educationLevel: "bachelors",
    skills: ["Sales", "Marketing", "Negotiation"],
    location: "Matara",
    district: "Matara",
    employmentType: "full-time",
    workMode: "onsite",
    salaryMin: 110000,
    salaryMax: 190000,
    benefits: "Fuel allowance, performance bonus",
    vacancies: 2,
    status: "approved",
    isFeatured: false,
    employerIndex: 5,
  },
  {
    title: "Telesales Executive",
    category: "Sales & Marketing",
    description: "Handle inbound and outbound calls for our consumer finance products.",
    responsibilities: "Handle customer enquiries. Meet daily call targets and keep the records clean.",
    qualifications: "A level completed. Clear spoken English and Sinhala.",
    experienceRequired: "1+ year",
    experienceLevel: "entry",
    educationLevel: "certificate",
    skills: ["Telesales", "Customer service", "CRM"],
    location: "Matara",
    district: "Matara",
    employmentType: "part-time",
    workMode: "onsite",
    salaryMin: 60000,
    salaryMax: 100000,
    benefits: "Transport, incentives",
    vacancies: 4,
    status: "pending",
    isFeatured: false,
    employerIndex: 5,
  },
  {
    title: "Data Engineering Intern",
    category: "Information Technology",
    description: "Six month internship with our data team, working on our reporting pipelines.",
    responsibilities: "Build and maintain pipelines. Write tests and document the datasets.",
    qualifications: "Undergraduate or fresh graduate in IT, Computer Science or Statistics.",
    experienceRequired: "Fresher",
    experienceLevel: "entry",
    educationLevel: "any",
    skills: ["Python", "SQL", "Pandas"],
    location: "Colombo 03",
    district: "Colombo",
    employmentType: "internship",
    workMode: "hybrid",
    salaryMin: 40000,
    salaryMax: 60000,
    benefits: "Mentoring, internship certificate",
    vacancies: 2,
    status: "draft",
    isFeatured: false,
    employerIndex: 0,
  },
];

// seekerIndex, jobIndex, status
const APPLICATIONS = [
  { seekerIndex: 0, jobIndex: 0, status: "shortlisted" },
  { seekerIndex: 1, jobIndex: 2, status: "interview" },
  { seekerIndex: 2, jobIndex: 4, status: "applied" },
  { seekerIndex: 3, jobIndex: 6, status: "hired" },
  { seekerIndex: 0, jobIndex: 7, status: "rejected" },
  { seekerIndex: 2, jobIndex: 1, status: "withdrawn" },
];

async function upsertUser(user, passwordHash, extra = {}) {
  const existing = await User.findOne({ email: user.email });
  if (existing) {
    existing.name = user.name;
    existing.role = user.role;
    existing.passwordHash = passwordHash;
    existing.district = user.district ?? "";
    existing.phone = user.phone ?? "";
    Object.assign(existing, extra);
    await existing.save();
    return existing;
  }

  return User.create({
    name: user.name,
    email: user.email,
    passwordHash,
    role: user.role,
    district: user.district ?? "",
    phone: user.phone ?? "",
    ...extra,
  });
}

async function seed() {
  console.log(`[seed] Connecting to ${env.mongoUri.replace(/\/\/([^:@/]+):([^@/]+)@/, "//$1:***@")}...`);

  try {
    await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 10000 });
  } catch (error) {
    console.error("");
    console.error("  [seed] FAILED: could not connect to MongoDB.");
    console.error(`  [seed] Reason: ${error.message}`);
    console.error("  [seed] Start a local mongod on port 27017, or point MONGODB_URI at MongoDB Atlas.");
    console.error("");
    process.exit(1);
  }

  console.log("[seed] Connected.");

  const passwordHash = await hashPassword(PASSWORD);

  // ------------------------------------------------------------- categories
  for (const category of CATEGORIES) {
    const slug = slugify(category.name);
    await Category.findOneAndUpdate(
      { slug },
      { ...category, slug },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
  }
  console.log(`[seed] Categories : ${CATEGORIES.length}`);

  // -------------------------------------------------------------- districts
  for (const [index, name] of DISTRICTS.entries()) {
    const slug = slugify(name);
    await District.findOneAndUpdate(
      { slug },
      { name, slug, order: index + 1 },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
  }
  console.log(`[seed] Districts  : ${DISTRICTS.length}`);

  // ------------------------------------------------------------------ users
  const admin = await upsertUser({ ...ADMIN }, passwordHash, { isVerified: true });
  console.log(`[seed] Admin      : ${admin.email}`);

  const seekers = [];
  for (const seeker of SEEKERS) {
    seekers.push(await upsertUser({ ...seeker, role: "seeker" }, passwordHash));
  }
  console.log(`[seed] Seekers    : ${seekers.length}`);

  const employers = [];
  for (const employer of EMPLOYERS) {
    let company = await Company.findOne({ name: employer.company.name });
    if (!company) {
      company = await Company.create({
        ...employer.company,
        district: employer.district,
        contactEmail: employer.email,
        contactPhone: employer.phone,
        isVerified: true,
      });
    } else {
      company.industry = employer.company.industry;
      company.address = employer.company.address;
      company.website = employer.company.website;
      company.contactPerson = employer.company.contactPerson;
      company.contactEmail = employer.email;
      company.contactPhone = employer.phone;
      company.district = employer.district;
      company.isVerified = true;
      await company.save();
    }

    const user = await upsertUser(
      { ...employer, role: "employer" },
      passwordHash,
      { company: company._id, isVerified: true }
    );
    company.owner = user._id;
    await company.save();

    employers.push(user);
  }
  console.log(`[seed] Employers  : ${employers.length} (with ${employers.length} companies)`);

  // ------------------------------------------------------------------- jobs
  const jobs = [];
  for (const job of JOBS) {
    const employer = employers[job.employerIndex];
    const payload = {
      title: job.title,
      category: job.category,
      description: job.description,
      responsibilities: job.responsibilities,
      qualifications: job.qualifications,
      experienceRequired: job.experienceRequired,
      experienceLevel: job.experienceLevel,
      educationLevel: job.educationLevel,
      skills: job.skills,
      location: job.location,
      district: job.district,
      employmentType: job.employmentType,
      workMode: job.workMode,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      salaryNegotiable: false,
      benefits: job.benefits,
      vacancies: job.vacancies,
      deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      status: job.status,
      isFeatured: job.isFeatured,
      employer: employer._id,
      company: employer.company,
      applicationsCount: 0,
      views: 0,
    };

    const existing = await Job.findOne({ title: job.title, employer: employer._id });
    if (existing) {
      Object.assign(existing, payload);
      await existing.save();
      jobs.push(existing);
    } else {
      jobs.push(await Job.create(payload));
    }
  }
  console.log(`[seed] Jobs       : ${jobs.length}`);

  // ----------------------------------------------------------- applications
  const counts = new Map();
  for (const entry of APPLICATIONS) {
    const seeker = seekers[entry.seekerIndex];
    const job = jobs[entry.jobIndex];

    const existing = await Application.findOne({ job: job._id, seeker: seeker._id });
    if (existing) {
      existing.status = entry.status;
      await existing.save();
    } else {
      await Application.create({
        job: job._id,
        seeker: seeker._id,
        coverLetter: `Dear hiring team, I am interested in the ${job.title} position.`,
        status: entry.status,
      });
    }

    counts.set(job._id.toString(), (counts.get(job._id.toString()) || 0) + 1);

    // Give the employer a notification about the application. The user + title
    // + link triple is stable, so re-seeding updates the same row.
    await Notification.findOneAndUpdate(
      { user: job.employer, title: "New application", link: `/applications?jobId=${job._id}` },
      {
        title: "New application",
        body: `A seeker applied for "${job.title}".`,
        type: "application",
        user: job.employer,
        link: `/applications?jobId=${job._id}`,
        read: false,
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
  }

  for (const [jobId, count] of counts.entries()) {
    await Job.updateOne({ _id: jobId }, { $set: { applicationsCount: count } });
  }
  console.log(`[seed] Applications: ${APPLICATIONS.length}`);

  // -------------------------------------------------------------- saved jobs
  let savedCount = 0;
  for (const [index, seeker] of seekers.entries()) {
    const job = jobs[index];
    await SavedJob.findOneAndUpdate(
      { user: seeker._id, job: job._id },
      { user: seeker._id, job: job._id },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
    savedCount += 1;
  }
  console.log(`[seed] Saved jobs : ${savedCount}`);

  // ------------------------------------------------------------------ totals
  const [totalUsers, totalCompanies, totalJobs, totalApplications, totalCategories, totalDistricts] =
    await Promise.all([
      User.countDocuments({}),
      Company.countDocuments({}),
      Job.countDocuments({}),
      Application.countDocuments({}),
      Category.countDocuments({}),
      District.countDocuments({}),
    ]);

  console.log("");
  console.log("[seed] Done. Database now holds:");
  console.log(`[seed]   users        : ${totalUsers}`);
  console.log(`[seed]   companies    : ${totalCompanies}`);
  console.log(`[seed]   jobs         : ${totalJobs}`);
  console.log(`[seed]   applications : ${totalApplications}`);
  console.log(`[seed]   categories   : ${totalCategories}`);
  console.log(`[seed]   districts    : ${totalDistricts}`);
  console.log("");
  console.log(`[seed] Admin login    : ${ADMIN.email} / ${PASSWORD}`);
  console.log(`[seed] Employer login : ${EMPLOYERS[0].email} / ${PASSWORD}  (${EMPLOYERS[0].company.name})`);
  console.log(`[seed] Employer login : ${EMPLOYERS[2].email} / ${PASSWORD}  (${EMPLOYERS[2].company.name})`);
  console.log(`[seed] Seeker login   : ${SEEKERS[0].email} / ${PASSWORD}`);

  await mongoose.disconnect();
}

seed().catch((error) => {
  console.error("[seed] Unexpected error:", error);
  process.exit(1);
});

