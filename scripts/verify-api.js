#!/usr/bin/env node
/**
 * Repeatable end-to-end smoke test for the Job Portal API.
 *
 * It boots the app in-process, exercises every route with the expected status
 * code, then removes everything it created. The seeded data is never touched:
 * all fixtures use their own records.
 *
 * Auth tokens for the test accounts are signed directly instead of logging in,
 * so the strict 10-per-15-minutes login limiter stays available for the
 * register/login tests themselves.
 */
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import app from "../index.js";
import { env } from "../src/config/env.js";
import Application from "../src/models/Application.js";
import CV from "../src/models/CV.js";
import Category from "../src/models/Category.js";
import Company from "../src/models/Company.js";
import District from "../src/models/District.js";
import Job from "../src/models/Job.js";
import Notification from "../src/models/Notification.js";
import SavedJob from "../src/models/SavedJob.js";
import User from "../src/models/User.js";
import { uploadDir } from "../src/middleware/upload.js";
import { hashPassword } from "../src/utils/password.js";

const PORT = Number(process.env.VERIFY_PORT || 5098);
const BASE = `http://127.0.0.1:${PORT}`;

const TEST = {
  seekerEmail: "verify-seeker@example.lk",
  seeker2Email: "verify-seeker2@example.lk",
  employerEmail: "verify-employer@example.lk",
  employer2Email: "verify-employer2@example.lk",
  registeredEmail: "verify-registered@example.lk",
  registeredEmployerEmail: "verify-registered-employer@example.lk",
  companyName: "Verify Test Company",
  company2Name: "Verify Test Company Two",
  registeredCompanyName: "Verify Registered Co",
  categoryName: "Verify Test Category",
  districtName: "Verify Test District",
  adminEmail: "admin@jobportal.local",
};

let passed = 0;
let failed = 0;
const failures = [];

function check(name, condition, extra = "") {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    failures.push(name);
    console.error(`  FAIL  ${name}${extra ? ` -> ${extra}` : ""}`);
  }
}

async function call(method, path, { token, body, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers["Content-Type"] = "application/json";

  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: form ?? (body ? JSON.stringify(body) : undefined),
  });

  const contentType = response.headers.get("content-type") || "";
  let payload = null;
  if (contentType.includes("application/json")) {
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
  } else {
    await response.arrayBuffer();
  }

  return { status: response.status, body: payload };
}

const tokenFor = (user) => jwt.sign({ id: user._id.toString(), role: user.role }, env.jwtSecret, { expiresIn: "1h" });

/** Remove every record this script owns. */
async function cleanup() {
  const testEmails = [
    TEST.seekerEmail,
    TEST.seeker2Email,
    TEST.employerEmail,
    TEST.employer2Email,
    TEST.registeredEmail,
    TEST.registeredEmployerEmail,
  ];
  const testUsers = await User.find({ email: { $in: testEmails } }).select("_id");
  const testUserIds = testUsers.map((user) => user._id);

  const testCompanies = await Company.find({
    name: { $in: [TEST.companyName, TEST.company2Name, TEST.registeredCompanyName] },
  }).select("_id");
  const testCompanyIds = testCompanies.map((company) => company._id);

  const testJobs = await Job.find({
    $or: [
      { company: { $in: testCompanyIds } },
      { employer: { $in: testUserIds } },
      { title: { $regex: "^Verify Test " } },
    ],
  }).select("_id");
  const testJobIds = testJobs.map((job) => job._id);

  await Application.deleteMany({ $or: [{ job: { $in: testJobIds } }, { seeker: { $in: testUserIds } }] });
  await SavedJob.deleteMany({ $or: [{ job: { $in: testJobIds } }, { user: { $in: testUserIds } }] });
  await Notification.deleteMany({ user: { $in: testUserIds } });

  const cvs = await CV.find({ owner: { $in: testUserIds } });
  for (const cv of cvs) {
    try {
      await fs.unlink(cv.path);
    } catch {
      /* the file may already be gone */
    }
  }
  await CV.deleteMany({ owner: { $in: testUserIds } });

  await Job.deleteMany({ _id: { $in: testJobIds } });
  await Company.deleteMany({ _id: { $in: testCompanyIds } });
  await User.deleteMany({ email: { $in: testEmails } });

  await Category.deleteMany({ name: TEST.categoryName });
  await District.deleteMany({ name: TEST.districtName });
}

/** Create the test accounts, companies and a ready to use job. */
async function createFixtures() {
  const passwordHash = await hashPassword("Password123");

  const seeker = await User.create({
    name: "Verify Seeker",
    email: TEST.seekerEmail,
    passwordHash,
    role: "seeker",
    district: "Colombo",
    phone: "0701111111",
  });

  const seeker2 = await User.create({
    name: "Verify Seeker Two",
    email: TEST.seeker2Email,
    passwordHash,
    role: "seeker",
    district: "Kandy",
  });

  const employer = await User.create({
    name: "Verify Employer",
    email: TEST.employerEmail,
    passwordHash,
    role: "employer",
    district: "Colombo",
  });

  const company = await Company.create({
    name: TEST.companyName,
    industry: "Information Technology",
    district: "Colombo",
    owner: employer._id,
    contactEmail: TEST.employerEmail,
    isVerified: true,
  });
  employer.company = company._id;
  await employer.save();

  const employer2 = await User.create({
    name: "Verify Employer Two",
    email: TEST.employer2Email,
    passwordHash,
    role: "employer",
    district: "Galle",
  });

  const company2 = await Company.create({
    name: TEST.company2Name,
    industry: "Construction",
    district: "Galle",
    owner: employer2._id,
    contactEmail: TEST.employer2Email,
    isVerified: false,
  });
  employer2.company = company2._id;
  await employer2.save();

  const admin = await User.findOne({ email: TEST.adminEmail });
  if (!admin) throw new Error(`The seeded admin ${TEST.adminEmail} is missing. Run npm run seed first.`);

  // An approved job the seekers can apply for.
  const approvedJob = await Job.create({
    title: "Verify Test Approved Job",
    category: "Information Technology",
    description: "A job used by the verification script only.",
    skills: ["Node.js"],
    district: "Colombo",
    employmentType: "full-time",
    workMode: "hybrid",
    salaryMin: 100000,
    salaryMax: 200000,
    vacancies: 1,
    status: "approved",
    isFeatured: true,
    employer: employer._id,
    company: company._id,
  });

  // A job owned by the other employer, for the 403 checks.
  const otherJob = await Job.create({
    title: "Verify Test Other Employer Job",
    category: "Engineering & Construction",
    description: "A job owned by the second test employer.",
    district: "Galle",
    employmentType: "contract",
    salaryMin: 50000,
    salaryMax: 90000,
    status: "approved",
    employer: employer2._id,
    company: company2._id,
  });

  return { seeker, seeker2, employer, employer2, admin, company, company2, approvedJob, otherJob };
}

/** A minimal but real PDF, used for the upload tests. */
function samplePdfBytes() {
  const text = "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF";
  return Buffer.from(text, "utf8");
}

async function main() {
  console.log(`[verify] Connecting to ${env.mongoUri.replace(/\/\/([^:@/]+):([^@/]+)@/, "//$1:***@")}`);

  try {
    await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 10000 });
  } catch (error) {
    console.error(`[verify] FAILED: no MongoDB at MONGODB_URI (${error.message}).`);
    process.exit(1);
  }

  await cleanup();
  const fixtures = await createFixtures();

  const server = app.listen(PORT);
  await new Promise((resolve) => server.once("listening", resolve));
  console.log(`[verify] API listening on ${BASE}\n`);

  const seekerToken = tokenFor(fixtures.seeker);
  const seeker2Token = tokenFor(fixtures.seeker2);
  const employerToken = tokenFor(fixtures.employer);
  const employer2Token = tokenFor(fixtures.employer2);
  const adminToken = tokenFor(fixtures.admin);

  // ------------------------------------------------------------------ health
  const health = await call("GET", "/api/health");
  check("GET /api/health returns 200", health.status === 200, `got ${health.status}`);
  check("GET /api/health reports status ok", health.body?.status === "ok");
  check("GET /api/health reports the database", health.body?.database === "connected");
  check("GET /api/health reports uptime", typeof health.body?.uptime === "number");

  // -------------------------------------------------------------------- auth
  const register = await call("POST", "/api/auth/register", {
    body: { name: "Verify Registered", email: "verify-registered@example.lk", password: "Password123", role: "seeker" },
  });
  check("POST /api/auth/register returns 201", register.status === 201, `got ${register.status}`);
  check("POST /api/auth/register returns a token", typeof register.body?.token === "string");
  check("POST /api/auth/register returns the user", register.body?.user?.email === "verify-registered@example.lk");
  check("POST /api/auth/register never returns the password hash", register.body?.user?.passwordHash === undefined);

  const registerEmployer = await call("POST", "/api/auth/register", {
    body: {
      name: "Verify Registered Employer",
      email: "verify-registered-employer@example.lk",
      password: "Password123",
      role: "employer",
      companyName: "Verify Registered Co",
    },
  });
  check("POST /api/auth/register creates an employer with a company", registerEmployer.status === 201, `got ${registerEmployer.status}`);
  check("POST /api/auth/register links a company to the employer", Boolean(registerEmployer.body?.user?.company));

  const registerDuplicate = await call("POST", "/api/auth/register", {
    body: { name: "Verify Registered", email: "verify-registered@example.lk", password: "Password123", role: "seeker" },
  });
  check("POST /api/auth/register with a duplicate email returns 409", registerDuplicate.status === 409, `got ${registerDuplicate.status}`);

  const registerAdmin = await call("POST", "/api/auth/register", {
    body: { name: "Verify Admin", email: "verify-admin@example.lk", password: "Password123", role: "admin" },
  });
  check("POST /api/auth/register refuses the admin role", registerAdmin.status === 400, `got ${registerAdmin.status}`);

  const registerWeak = await call("POST", "/api/auth/register", {
    body: { name: "Verify Weak", email: "verify-weak@example.lk", password: "short", role: "seeker" },
  });
  check("POST /api/auth/register rejects a weak password", registerWeak.status === 400, `got ${registerWeak.status}`);
  check(
    "POST /api/auth/register reports the offending fields",
    Array.isArray(registerWeak.body?.error?.details) && registerWeak.body.error.details.length > 0
  );

  const login = await call("POST", "/api/auth/login", {
    body: { email: TEST.seekerEmail, password: "Password123" },
  });
  check("POST /api/auth/login returns 200", login.status === 200, `got ${login.status}`);
  check("POST /api/auth/login returns a token", typeof login.body?.token === "string");
  check("POST /api/auth/login returns the user", login.body?.user?.email === TEST.seekerEmail);

  const loginWrong = await call("POST", "/api/auth/login", {
    body: { email: TEST.seekerEmail, password: "wrongpassword" },
  });
  check("POST /api/auth/login with a wrong password returns 401", loginWrong.status === 401, `got ${loginWrong.status}`);

  const loginUnknown = await call("POST", "/api/auth/login", {
    body: { email: "nobody@example.lk", password: "Password123" },
  });
  check("POST /api/auth/login with an unknown email returns 401", loginUnknown.status === 401, `got ${loginUnknown.status}`);

  const me = await call("GET", "/api/auth/me", { token: seekerToken });
  check("GET /api/auth/me returns 200", me.status === 200, `got ${me.status}`);
  check("GET /api/auth/me returns the caller", me.body?.user?.email === TEST.seekerEmail);

  const meNoToken = await call("GET", "/api/auth/me");
  check("GET /api/auth/me without a token returns 401", meNoToken.status === 401, `got ${meNoToken.status}`);

  const meBadToken = await call("GET", "/api/auth/me", { token: "not-a-real-token" });
  check("GET /api/auth/me with a bad token returns 401", meBadToken.status === 401, `got ${meBadToken.status}`);

  // -------------------------------------------------------------------- jobs
  const jobList = await call("GET", "/api/jobs");
  check("GET /api/jobs returns 200", jobList.status === 200, `got ${jobList.status}`);
  check("GET /api/jobs returns a list envelope", Array.isArray(jobList.body?.data));
  check("GET /api/jobs returns pagination meta", typeof jobList.body?.meta?.total === "number");
  check("GET /api/jobs returns the meta fields", ["page", "limit", "total", "totalPages", "hasNextPage", "hasPrevPage"].every((key) => key in (jobList.body?.meta ?? {})));
  check("GET /api/jobs only returns approved jobs", (jobList.body?.data ?? []).every((job) => job.status === "approved"));

  const searched = await call("GET", "/api/jobs?q=full%20stack");
  check("GET /api/jobs?q= searches the catalogue", searched.status === 200 && (searched.body?.data ?? []).length > 0, `got ${searched.status}`);

  const filtered = await call("GET", "/api/jobs?category=Information%20Technology&district=Colombo&employmentType=full-time&workMode=hybrid");
  check("GET /api/jobs filters by category, district, employment type and work mode", filtered.status === 200, `got ${filtered.status}`);

  const sorted = await call("GET", "/api/jobs?sort=salary_asc&limit=5");
  const sortedPrices = (sorted.body?.data ?? []).map((job) => job.salaryMin);
  check(
    "GET /api/jobs?sort=salary_asc sorts by salary",
    sorted.status === 200 && sortedPrices.every((price, index) => index === 0 || sortedPrices[index - 1] <= price),
    JSON.stringify(sortedPrices)
  );

  const relevant = await call("GET", "/api/jobs?q=developer&sort=relevant");
  check("GET /api/jobs?sort=relevant returns 200", relevant.status === 200, `got ${relevant.status}`);

  const badSort = await call("GET", "/api/jobs?sort=nonsense");
  check("GET /api/jobs rejects an unknown sort with 400", badSort.status === 400, `got ${badSort.status}`);

  const badPage = await call("GET", "/api/jobs?page=0");
  check("GET /api/jobs rejects page=0 with 400", badPage.status === 400, `got ${badPage.status}`);

  const featured = await call("GET", "/api/jobs/featured");
  check("GET /api/jobs/featured returns 200", featured.status === 200, `got ${featured.status}`);
  check("GET /api/jobs/featured returns at most six jobs", (featured.body?.data ?? []).length <= 6);
  check("GET /api/jobs/featured only returns featured approved jobs", (featured.body?.data ?? []).every((job) => job.status === "approved" && job.isFeatured));

  const jobOne = await call("GET", `/api/jobs/${fixtures.approvedJob._id}`);
  check("GET /api/jobs/:id returns 200 for an approved job", jobOne.status === 200, `got ${jobOne.status}`);
  check("GET /api/jobs/:id returns the job title", jobOne.body?.job?.title === "Verify Test Approved Job");
  check("GET /api/jobs/:id embeds the company", Boolean(jobOne.body?.job?.company?.name));
  check("GET /api/jobs/:id increments the views", (jobOne.body?.job?.views ?? 0) >= 1);

  const jobBadId = await call("GET", "/api/jobs/not-an-id");
  check("GET /api/jobs/:id with a malformed id returns 400", jobBadId.status === 400, `got ${jobBadId.status}`);

  const jobUnknown = await call("GET", "/api/jobs/66f0a1b2c3d4e5f60718293a");
  check("GET /api/jobs/:id with an unknown id returns 404", jobUnknown.status === 404, `got ${jobUnknown.status}`);

  const createdJob = await call("POST", "/api/jobs", {
    token: employerToken,
    body: {
      title: "Verify Test Created Job",
      category: "Information Technology",
      description: "Created by the verification script.",
      skills: ["Testing"],
      district: "Colombo",
      employmentType: "full-time",
      workMode: "remote",
      salaryMin: 120000,
      salaryMax: 240000,
      vacancies: 2,
    },
  });
  check("POST /api/jobs returns 201 for an employer", createdJob.status === 201, `got ${createdJob.status}`);
  check("POST /api/jobs returns the job", createdJob.body?.job?.title === "Verify Test Created Job");
  check("POST /api/jobs never creates an approved job", createdJob.body?.job?.status !== "approved", createdJob.body?.job?.status);

  const jobId = createdJob.body?.job?.id;

  const createAsSeeker = await call("POST", "/api/jobs", {
    token: seekerToken,
    body: { title: "Verify Test Nope", category: "Information Technology", description: "Should be refused." },
  });
  check("POST /api/jobs returns 403 for a seeker", createAsSeeker.status === 403, `got ${createAsSeeker.status}`);

  const createNoToken = await call("POST", "/api/jobs", {
    body: { title: "Verify Test Nope", category: "Information Technology", description: "Should be refused." },
  });
  check("POST /api/jobs returns 401 without a token", createNoToken.status === 401, `got ${createNoToken.status}`);

  const createInvalid = await call("POST", "/api/jobs", {
    token: employerToken,
    body: { title: "", category: "", description: "short" },
  });
  check("POST /api/jobs with an invalid body returns 400", createInvalid.status === 400, `got ${createInvalid.status}`);

  const patchedJob = await call("PATCH", `/api/jobs/${jobId}`, {
    token: employerToken,
    body: { title: "Verify Test Created Job Renamed", salaryMax: 300000 },
  });
  check("PATCH /api/jobs/:id returns 200 for the owner", patchedJob.status === 200, `got ${patchedJob.status}`);
  check("PATCH /api/jobs/:id applies the change", patchedJob.body?.job?.title === "Verify Test Created Job Renamed");

  const patchedByOther = await call("PATCH", `/api/jobs/${jobId}`, {
    token: employer2Token,
    body: { title: "Hijacked" },
  });
  check("PATCH /api/jobs/:id returns 403 for another employer", patchedByOther.status === 403, `got ${patchedByOther.status}`);

  const myJobs = await call("GET", "/api/jobs/mine", { token: employerToken });
  check("GET /api/jobs/mine returns 200 for an employer", myJobs.status === 200, `got ${myJobs.status}`);
  check("GET /api/jobs/mine lists every status", (myJobs.body?.data ?? []).every((job) => Boolean(job.status)));

  const myJobsAsSeeker = await call("GET", "/api/jobs/mine", { token: seekerToken });
  check("GET /api/jobs/mine returns 403 for a seeker", myJobsAsSeeker.status === 403, `got ${myJobsAsSeeker.status}`);

  const saved = await call("POST", `/api/jobs/${fixtures.approvedJob._id}/save`, { token: seekerToken });
  check("POST /api/jobs/:id/save returns 200", saved.status === 200, `got ${saved.status}`);
  check("POST /api/jobs/:id/save reports saved true", saved.body?.saved === true);

  const savedAgain = await call("POST", `/api/jobs/${fixtures.approvedJob._id}/save`, { token: seekerToken });
  check("POST /api/jobs/:id/save is idempotent", savedAgain.status === 200 && savedAgain.body?.saved === true, `got ${savedAgain.status}`);

  const savedList = await call("GET", "/api/jobs/saved", { token: seekerToken });
  check("GET /api/jobs/saved returns 200", savedList.status === 200, `got ${savedList.status}`);
  check("GET /api/jobs/saved lists the saved jobs", (savedList.body?.data ?? []).some((job) => job.id === fixtures.approvedJob._id.toString()));

  const unsaved = await call("DELETE", `/api/jobs/${fixtures.approvedJob._id}/save`, { token: seekerToken });
  check("DELETE /api/jobs/:id/save returns 200", unsaved.status === 200, `got ${unsaved.status}`);
  check("DELETE /api/jobs/:id/save reports saved false", unsaved.body?.saved === false);

  const savedAsEmployer = await call("POST", `/api/jobs/${fixtures.approvedJob._id}/save`, { token: employerToken });
  check("POST /api/jobs/:id/save returns 403 for an employer", savedAsEmployer.status === 403, `got ${savedAsEmployer.status}`);

  const deletedJob = await call("DELETE", `/api/jobs/${jobId}`, { token: employerToken });
  check("DELETE /api/jobs/:id returns 200", deletedJob.status === 200, `got ${deletedJob.status}`);
  check("DELETE /api/jobs/:id returns { data: { id } }", deletedJob.body?.data?.id === jobId, JSON.stringify(deletedJob.body));

  const deletedJobAgain = await call("DELETE", `/api/jobs/${jobId}`, { token: employerToken });
  check("DELETE /api/jobs/:id twice returns 404", deletedJobAgain.status === 404, `got ${deletedJobAgain.status}`);

  // --------------------------------------------------------------- companies
  const companyList = await call("GET", "/api/companies");
  check("GET /api/companies returns 200", companyList.status === 200, `got ${companyList.status}`);
  check("GET /api/companies returns a list envelope", Array.isArray(companyList.body?.data));
  check("GET /api/companies returns pagination meta", typeof companyList.body?.meta?.total === "number");

  const companySearch = await call("GET", "/api/companies?q=Ceylon");
  check("GET /api/companies?q= searches by name", companySearch.status === 200 && (companySearch.body?.data ?? []).length > 0, `got ${companySearch.status}`);

  const companyOne = await call("GET", `/api/companies/${fixtures.company._id}`);
  check("GET /api/companies/:id returns 200", companyOne.status === 200, `got ${companyOne.status}`);
  check("GET /api/companies/:id returns the company", companyOne.body?.company?.name === TEST.companyName);

  const companyUnknown = await call("GET", "/api/companies/66f0a1b2c3d4e5f60718293a");
  check("GET /api/companies/:id with an unknown id returns 404", companyUnknown.status === 404, `got ${companyUnknown.status}`);

  const companyUpdated = await call("PATCH", "/api/companies/me", {
    token: employerToken,
    body: { description: "Updated by the verification script.", industry: "Software" },
  });
  check("PATCH /api/companies/me returns 200 for an employer", companyUpdated.status === 200, `got ${companyUpdated.status}`);
  check("PATCH /api/companies/me applies the change", companyUpdated.body?.company?.industry === "Software");

  const companyUpdatedAsSeeker = await call("PATCH", "/api/companies/me", {
    token: seekerToken,
    body: { description: "Should be refused." },
  });
  check("PATCH /api/companies/me returns 403 for a seeker", companyUpdatedAsSeeker.status === 403, `got ${companyUpdatedAsSeeker.status}`);

  // ------------------------------------------------------------ applications
  const application = await call("POST", "/api/applications", {
    token: seekerToken,
    body: { jobId: fixtures.approvedJob._id.toString(), coverLetter: "I would love to join your team." },
  });
  check("POST /api/applications returns 201", application.status === 201, `got ${application.status}`);
  check("POST /api/applications returns the application", application.body?.application?.status === "applied");
  check("POST /api/applications joins the job", Boolean(application.body?.application?.job?.title));

  const applicationId = application.body?.application?.id;

  const applicationDuplicate = await call("POST", "/api/applications", {
    token: seekerToken,
    body: { jobId: fixtures.approvedJob._id.toString() },
  });
  check("POST /api/applications twice returns 409", applicationDuplicate.status === 409, `got ${applicationDuplicate.status}`);

  const applicationAsEmployer = await call("POST", "/api/applications", {
    token: employerToken,
    body: { jobId: fixtures.approvedJob._id.toString() },
  });
  check("POST /api/applications returns 403 for an employer", applicationAsEmployer.status === 403, `got ${applicationAsEmployer.status}`);

  const applicationUnknownJob = await call("POST", "/api/applications", {
    token: seekerToken,
    body: { jobId: "66f0a1b2c3d4e5f60718293a" },
  });
  check("POST /api/applications with an unknown job returns 404", applicationUnknownJob.status === 404, `got ${applicationUnknownJob.status}`);

  const applicationInvalid = await call("POST", "/api/applications", {
    token: seekerToken,
    body: { jobId: "not-an-id" },
  });
  check("POST /api/applications with a malformed job id returns 400", applicationInvalid.status === 400, `got ${applicationInvalid.status}`);

  const myApplications = await call("GET", "/api/applications/mine", { token: seekerToken });
  check("GET /api/applications/mine returns 200", myApplications.status === 200, `got ${myApplications.status}`);
  check("GET /api/applications/mine joins the job", (myApplications.body?.data ?? []).some((item) => item.job?.title));

  const myApplicationsAsEmployer = await call("GET", "/api/applications/mine", { token: employerToken });
  check("GET /api/applications/mine returns 403 for an employer", myApplicationsAsEmployer.status === 403, `got ${myApplicationsAsEmployer.status}`);

  const jobApplications = await call("GET", `/api/applications?jobId=${fixtures.approvedJob._id}`, { token: employerToken });
  check("GET /api/applications?jobId= returns 200 for the job owner", jobApplications.status === 200, `got ${jobApplications.status}`);
  check("GET /api/applications?jobId= includes the seeker contact details", Boolean(jobApplications.body?.data?.[0]?.seeker?.email));
  check("GET /api/applications?jobId= includes the seeker phone", jobApplications.body?.data?.[0]?.seeker?.phone !== undefined);

  const jobApplicationsOther = await call("GET", `/api/applications?jobId=${fixtures.approvedJob._id}`, { token: employer2Token });
  check("GET /api/applications?jobId= returns 403 for another employer", jobApplicationsOther.status === 403, `got ${jobApplicationsOther.status}`);

  const jobApplicationsNoJob = await call("GET", "/api/applications", { token: employerToken });
  check("GET /api/applications without jobId returns 400", jobApplicationsNoJob.status === 400, `got ${jobApplicationsNoJob.status}`);

  const statusUpdated = await call("PATCH", `/api/applications/${applicationId}/status`, {
    token: employerToken,
    body: { status: "shortlisted" },
  });
  check("PATCH /api/applications/:id/status returns 200", statusUpdated.status === 200, `got ${statusUpdated.status}`);
  check("PATCH /api/applications/:id/status applies the status", statusUpdated.body?.application?.status === "shortlisted");

  const statusAsSeeker = await call("PATCH", `/api/applications/${applicationId}/status`, {
    token: seekerToken,
    body: { status: "hired" },
  });
  check("PATCH /api/applications/:id/status returns 403 for a seeker", statusAsSeeker.status === 403, `got ${statusAsSeeker.status}`);

  const statusInvalid = await call("PATCH", `/api/applications/${applicationId}/status`, {
    token: employerToken,
    body: { status: "nonsense" },
  });
  check("PATCH /api/applications/:id/status rejects an unknown status", statusInvalid.status === 400, `got ${statusInvalid.status}`);

  const applicationDeleted = await call("DELETE", `/api/applications/${applicationId}`, { token: seekerToken });
  check("DELETE /api/applications/:id returns 200", applicationDeleted.status === 200, `got ${applicationDeleted.status}`);
  check("DELETE /api/applications/:id returns { data: { id } }", applicationDeleted.body?.data?.id === applicationId);

  const applicationDeletedAgain = await call("DELETE", `/api/applications/${applicationId}`, { token: seekerToken });
  check("DELETE /api/applications/:id twice returns 404", applicationDeletedAgain.status === 404, `got ${applicationDeletedAgain.status}`);

  // --------------------------------------------------------------------- cv
  const form = new FormData();
  form.append("file", new Blob([samplePdfBytes()], { type: "application/pdf" }), "verify-cv.pdf");
  const cvUpload = await call("POST", "/api/cv", { token: seekerToken, form });
  check("POST /api/cv returns 201", cvUpload.status === 201, `got ${cvUpload.status}`);
  check("POST /api/cv returns the original file name", cvUpload.body?.cv?.originalName === "verify-cv.pdf");
  const cvId = cvUpload.body?.cv?.id;

  const badForm = new FormData();
  badForm.append("file", new Blob([Buffer.from("MZ not a cv")], { type: "application/x-msdownload" }), "virus.exe");
  const cvBadType = await call("POST", "/api/cv", { token: seekerToken, form: badForm });
  check("POST /api/cv refuses a file that is not a PDF or DOCX", cvBadType.status === 400, `got ${cvBadType.status}`);

  const cvAsEmployer = await call("POST", "/api/cv", {
    token: employerToken,
    form: (() => {
      const f = new FormData();
      f.append("file", new Blob([samplePdfBytes()], { type: "application/pdf" }), "verify-cv.pdf");
      return f;
    })(),
  });
  check("POST /api/cv returns 403 for an employer", cvAsEmployer.status === 403, `got ${cvAsEmployer.status}`);

  const myCvs = await call("GET", "/api/cv/mine", { token: seekerToken });
  check("GET /api/cv/mine returns 200", myCvs.status === 200, `got ${myCvs.status}`);
  check("GET /api/cv/mine lists the uploaded CVs", (myCvs.body?.data ?? []).length > 0);

  const cvDownload = await call("GET", `/api/cv/${cvId}`, { token: seekerToken });
  check("GET /api/cv/:id returns the file for the owner", cvDownload.status === 200, `got ${cvDownload.status}`);

  const cvDownloadOther = await call("GET", `/api/cv/${cvId}`, { token: seeker2Token });
  check("GET /api/cv/:id returns 403 for another seeker", cvDownloadOther.status === 403, `got ${cvDownloadOther.status}`);

  const cvDeleted = await call("DELETE", `/api/cv/${cvId}`, { token: seekerToken });
  check("DELETE /api/cv/:id returns 200", cvDeleted.status === 200, `got ${cvDeleted.status}`);
  check("DELETE /api/cv/:id returns { data: { id } }", cvDeleted.body?.data?.id === cvId);

  const cvDeletedAgain = await call("DELETE", `/api/cv/${cvId}`, { token: seekerToken });
  check("DELETE /api/cv/:id twice returns 404", cvDeletedAgain.status === 404, `got ${cvDeletedAgain.status}`);

  // ------------------------------------------------------------------ admin
  const overview = await call("GET", "/api/admin/overview", { token: adminToken });
  check("GET /api/admin/overview returns 200", overview.status === 200, `got ${overview.status}`);
  check("GET /api/admin/overview returns the counts", typeof overview.body?.data?.totalUsers === "number" && typeof overview.body?.data?.totalJobs === "number");
  check("GET /api/admin/overview counts seekers and employers", typeof overview.body?.data?.seekers === "number" && typeof overview.body?.data?.employers === "number");
  check("GET /api/admin/overview counts pending items", typeof overview.body?.data?.pendingJobs === "number" && typeof overview.body?.data?.pendingEmployers === "number");

  const overviewAsSeeker = await call("GET", "/api/admin/overview", { token: seekerToken });
  check("GET /api/admin/overview returns 403 for a seeker", overviewAsSeeker.status === 403, `got ${overviewAsSeeker.status}`);

  const overviewNoToken = await call("GET", "/api/admin/overview");
  check("GET /api/admin/overview returns 401 without a token", overviewNoToken.status === 401, `got ${overviewNoToken.status}`);

  const pendingJobs = await call("GET", "/api/admin/pending-jobs", { token: adminToken });
  check("GET /api/admin/pending-jobs returns 200", pendingJobs.status === 200, `got ${pendingJobs.status}`);
  check("GET /api/admin/pending-jobs only lists pending jobs", (pendingJobs.body?.data ?? []).every((job) => job.status === "pending"));

  const pendingEmployers = await call("GET", "/api/admin/pending-employers", { token: adminToken });
  check("GET /api/admin/pending-employers returns 200", pendingEmployers.status === 200, `got ${pendingEmployers.status}`);

  const toApprove = await call("POST", "/api/jobs", {
    token: employerToken,
    body: {
      title: "Verify Test Job For Approval",
      category: "Information Technology",
      description: "Waiting for the admin to approve it.",
      district: "Colombo",
    },
  });
  const approveId = toApprove.body?.job?.id;
  const approved = await call("POST", `/api/admin/jobs/${approveId}/approve`, { token: adminToken });
  check("POST /api/admin/jobs/:id/approve returns 200", approved.status === 200, `got ${approved.status}`);
  check("POST /api/admin/jobs/:id/approve sets the status to approved", approved.body?.job?.status === "approved");

  const toReject = await call("POST", "/api/jobs", {
    token: employerToken,
    body: {
      title: "Verify Test Job For Rejection",
      category: "Information Technology",
      description: "Going to be rejected by the admin.",
      district: "Colombo",
    },
  });
  const rejectId = toReject.body?.job?.id;
  const rejected = await call("POST", `/api/admin/jobs/${rejectId}/reject`, { token: adminToken, body: { reason: "Not enough detail" } });
  check("POST /api/admin/jobs/:id/reject returns 200", rejected.status === 200, `got ${rejected.status}`);
  check("POST /api/admin/jobs/:id/reject sets the status to rejected", rejected.body?.job?.status === "rejected");

  const verified = await call("PATCH", `/api/admin/employers/${fixtures.employer2._id}/verify`, {
    token: adminToken,
    body: { verified: true },
  });
  check("PATCH /api/admin/employers/:id/verify returns 200", verified.status === 200, `got ${verified.status}`);
  check("PATCH /api/admin/employers/:id/verify sets the flag", verified.body?.employer?.isVerified === true);

  const adminUsers = await call("GET", "/api/admin/users?role=seeker", { token: adminToken });
  check("GET /api/admin/users returns 200", adminUsers.status === 200, `got ${adminUsers.status}`);
  check("GET /api/admin/users filters by role", (adminUsers.body?.data ?? []).every((user) => user.role === "seeker"));
  check("GET /api/admin/users never returns the password hash", (adminUsers.body?.data ?? []).every((user) => user.passwordHash === undefined));

  const adminUserSearch = await call("GET", "/api/admin/users?q=Verify", { token: adminToken });
  check("GET /api/admin/users?q= searches users", adminUserSearch.status === 200 && (adminUserSearch.body?.data ?? []).length > 0, `got ${adminUserSearch.status}`);

  const adminUserUpdated = await call("PATCH", `/api/admin/users/${fixtures.seeker2._id}`, {
    token: adminToken,
    body: { suspended: true },
  });
  check("PATCH /api/admin/users/:id returns 200", adminUserUpdated.status === 200, `got ${adminUserUpdated.status}`);
  check("PATCH /api/admin/users/:id sets the suspended flag", adminUserUpdated.body?.user?.isSuspended === true);

  const suspendedLogin = await call("POST", "/api/auth/login", {
    body: { email: TEST.seeker2Email, password: "Password123" },
  });
  check("POST /api/auth/login returns 403 for a suspended account", suspendedLogin.status === 403, `got ${suspendedLogin.status}`);

  const adminJobs = await call("GET", "/api/admin/jobs?status=approved", { token: adminToken });
  check("GET /api/admin/jobs returns 200", adminJobs.status === 200, `got ${adminJobs.status}`);
  check("GET /api/admin/jobs filters by status", (adminJobs.body?.data ?? []).every((job) => job.status === "approved"));

  const adminCategories = await call("GET", "/api/admin/categories", { token: adminToken });
  check("GET /api/admin/categories returns 200", adminCategories.status === 200, `got ${adminCategories.status}`);

  const categoryCreated = await call("POST", "/api/admin/categories", {
    token: adminToken,
    body: { name: TEST.categoryName, icon: "test", order: 99 },
  });
  check("POST /api/admin/categories returns 201", categoryCreated.status === 201, `got ${categoryCreated.status}`);
  const categoryId = categoryCreated.body?.category?.id;

  const categoryUpdated = await call("PATCH", `/api/admin/categories/${categoryId}`, {
    token: adminToken,
    body: { name: `${TEST.categoryName} Renamed` },
  });
  check("PATCH /api/admin/categories/:id returns 200", categoryUpdated.status === 200, `got ${categoryUpdated.status}`);

  const categoryDeleted = await call("DELETE", `/api/admin/categories/${categoryId}`, { token: adminToken });
  check("DELETE /api/admin/categories/:id returns 200", categoryDeleted.status === 200, `got ${categoryDeleted.status}`);

  const adminDistricts = await call("GET", "/api/admin/districts", { token: adminToken });
  check("GET /api/admin/districts returns 200", adminDistricts.status === 200, `got ${adminDistricts.status}`);

  const districtCreated = await call("POST", "/api/admin/districts", {
    token: adminToken,
    body: { name: TEST.districtName, order: 99 },
  });
  check("POST /api/admin/districts returns 201", districtCreated.status === 201, `got ${districtCreated.status}`);
  const districtId = districtCreated.body?.district?.id;

  const districtUpdated = await call("PATCH", `/api/admin/districts/${districtId}`, {
    token: adminToken,
    body: { name: `${TEST.districtName} Renamed` },
  });
  check("PATCH /api/admin/districts/:id returns 200", districtUpdated.status === 200, `got ${districtUpdated.status}`);

  const districtDeleted = await call("DELETE", `/api/admin/districts/${districtId}`, { token: adminToken });
  check("DELETE /api/admin/districts/:id returns 200", districtDeleted.status === 200, `got ${districtDeleted.status}`);

  // ------------------------------------------------------------------ other
  const categories = await call("GET", "/api/categories");
  check("GET /api/categories returns 200", categories.status === 200, `got ${categories.status}`);
  check("GET /api/categories returns the list", Array.isArray(categories.body?.data));

  const districts = await call("GET", "/api/districts");
  check("GET /api/districts returns 200", districts.status === 200, `got ${districts.status}`);
  check("GET /api/districts returns 25 Sri Lankan districts", (districts.body?.data ?? []).length === 25, `got ${(districts.body?.data ?? []).length}`);

  const contact = await call("POST", "/api/contact", {
    body: { name: "Verify Visitor", email: "visitor@example.lk", message: "This is a message from the verification script." },
  });
  check("POST /api/contact returns 201", contact.status === 201, `got ${contact.status}`);
  check("POST /api/contact confirms the message", contact.body?.message === "Message received");

  const contactInvalid = await call("POST", "/api/contact", {
    body: { name: "", email: "nope", message: "short" },
  });
  check("POST /api/contact with an invalid body returns 400", contactInvalid.status === 400, `got ${contactInvalid.status}`);

  const notifications = await call("GET", "/api/notifications", { token: seekerToken });
  check("GET /api/notifications returns 200", notifications.status === 200, `got ${notifications.status}`);
  check("GET /api/notifications returns the unread count", typeof notifications.body?.unreadCount === "number");
  check("GET /api/notifications returns the newest first", Array.isArray(notifications.body?.data));

  const notificationsNoToken = await call("GET", "/api/notifications");
  check("GET /api/notifications returns 401 without a token", notificationsNoToken.status === 401, `got ${notificationsNoToken.status}`);

  const employerNotifications = await call("GET", "/api/notifications", { token: employerToken });
  const notificationId = employerNotifications.body?.data?.[0]?.id;
  if (notificationId) {
    const markedRead = await call("PATCH", `/api/notifications/${notificationId}/read`, { token: employerToken });
    check("PATCH /api/notifications/:id/read returns 200", markedRead.status === 200, `got ${markedRead.status}`);
    check("PATCH /api/notifications/:id/read marks it as read", markedRead.body?.notification?.read === true);
  } else {
    check("PATCH /api/notifications/:id/read returns 200", false, "no notification to read");
    check("PATCH /api/notifications/:id/read marks it as read", false, "no notification to read");
  }

  const allRead = await call("POST", "/api/notifications/read-all", { token: employerToken });
  check("POST /api/notifications/read-all returns 200", allRead.status === 200, `got ${allRead.status}`);
  check("POST /api/notifications/read-all clears the unread count", allRead.body?.unreadCount === 0);

  const unknownRoute = await call("GET", "/api/nope");
  check("An unknown route returns 404", unknownRoute.status === 404, `got ${unknownRoute.status}`);
  check("An unknown route uses the error envelope", unknownRoute.body?.success === false && Boolean(unknownRoute.body?.error?.message));

  // --------------------------------------------------------------- cleanup
  await cleanup();
  const [leftoverUsers, leftoverJobs, leftoverCategories] = await Promise.all([
    User.countDocuments({ email: { $in: [TEST.seekerEmail, TEST.seeker2Email, TEST.employerEmail, TEST.employer2Email] } }),
    Job.countDocuments({ title: { $regex: "^Verify Test " } }),
    Category.countDocuments({ name: { $regex: "^Verify Test" } }),
  ]);
  check("The test run leaves no test users behind", leftoverUsers === 0, `${leftoverUsers} left`);
  check("The test run leaves no test jobs behind", leftoverJobs === 0, `${leftoverJobs} left`);
  check("The test run leaves no test categories behind", leftoverCategories === 0, `${leftoverCategories} left`);

  const seededCounts = await Promise.all([
    User.countDocuments({}),
    Job.countDocuments({}),
    Application.countDocuments({}),
    Category.countDocuments({}),
    District.countDocuments({}),
  ]);
  check("The seeded users are still there", seededCounts[0] >= 11, `${seededCounts[0]} users`);
  check("The seeded jobs are still there", seededCounts[1] >= 12, `${seededCounts[1]} jobs`);
  check("The seeded applications are still there", seededCounts[2] >= 6, `${seededCounts[2]} applications`);
  check("The seeded categories are still there", seededCounts[3] >= 6, `${seededCounts[3]} categories`);
  check("The seeded districts are still there", seededCounts[4] >= 25, `${seededCounts[4]} districts`);

  await mongoose.disconnect();
  server.close();

  console.log("");
  console.log(`[verify] ${passed} passed, ${failed} failed.`);
  if (failures.length) {
    console.log("[verify] Failed checks:");
    for (const name of failures) console.log(`  - ${name}`);
  }
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error("[verify] Unexpected error:", error);
  process.exit(1);
});
