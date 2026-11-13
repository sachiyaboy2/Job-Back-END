import Category from "../models/Category.js";
import Application from "../models/Application.js";
import District from "../models/District.js";
import { ApiError } from "../utils/ApiError.js";
import { buildMeta, readPagination } from "../utils/pagination.js";
import { notifyUser } from "../utils/notify.js";
import { okCreated, okList, okResource } from "../utils/response.js";
import { publicCompany, publicJob, publicUser } from "../utils/serialize.js";
import Company from "../models/Company.js";
import Job from "../models/Job.js";
import User from "../models/User.js";

const JOB_POPULATE = [
  { path: "company" },
  { path: "employer", select: "name email phone district avatarUrl role" },
];

/** GET /api/admin/overview */
export async function overview(req, res) {
  const [
    totalUsers,
    seekers,
    employers,
    pendingJobs,
    pendingEmployers,
    totalJobs,
    totalApplications,
  ] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ role: "seeker" }),
    User.countDocuments({ role: "employer" }),
    Job.countDocuments({ status: "pending" }),
    Company.countDocuments({ isVerified: false }),
    Job.countDocuments({}),
    Application.countDocuments({}),
  ]);

  const counts = {
    totalUsers,
    seekers,
    employers,
    pendingJobs,
    pendingEmployers,
    totalJobs,
    totalApplications,
  };

  return res.status(200).json({ success: true, ...counts, data: counts });
}

/** GET /api/admin/pending-jobs */
export async function pendingJobs(req, res) {
  const { page, limit, skip } = readPagination(req.query);

  const [jobs, total] = await Promise.all([
    Job.find({ status: "pending" })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate(JOB_POPULATE),
    Job.countDocuments({ status: "pending" }),
  ]);

  return okList(res, "jobs", jobs.map(publicJob), buildMeta({ page, limit, total }));
}

/** GET /api/admin/pending-employers */
export async function pendingEmployers(req, res) {
  const { page, limit, skip } = readPagination(req.query);

  const [companies, total] = await Promise.all([
    Company.find({ isVerified: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("owner", "name email phone district role"),
    Company.countDocuments({ isVerified: false }),
  ]);

  const employers = companies.map((company) => ({
    ...publicCompany(company),
    owner: company.owner ? publicUser(company.owner) : null,
  }));

  return okList(res, "employers", employers, buildMeta({ page, limit, total }));
}

/** POST /api/admin/jobs/:id/approve */
export async function approveJob(req, res) {
  const job = await Job.findById(req.params.id);
  if (!job) throw ApiError.notFound("Job not found");

  job.status = "approved";
  await job.save();

  await notifyUser({
    user: job.employer,
    title: "Job approved",
    body: `"${job.title}" is now live on the portal.`,
    type: "job",
    link: `/jobs/${job._id}`,
  });

  const populated = await Job.findById(job._id).populate(JOB_POPULATE);
  return okResource(res, "job", publicJob(populated), "Job approved");
}

/** POST /api/admin/jobs/:id/reject */
export async function rejectJob(req, res) {
  const job = await Job.findById(req.params.id);
  if (!job) throw ApiError.notFound("Job not found");

  job.status = "rejected";
  await job.save();

  const reason = req.body.reason ? ` Reason: ${req.body.reason}` : "";
  await notifyUser({
    user: job.employer,
    title: "Job rejected",
    body: `"${job.title}" was rejected.${reason}`,
    type: "job",
    link: `/jobs/${job._id}`,
  });

  const populated = await Job.findById(job._id).populate(JOB_POPULATE);
  return okResource(res, "job", publicJob(populated), "Job rejected");
}

/** PATCH /api/admin/employers/:id/verify */
export async function verifyEmployer(req, res) {
  const employer = await User.findById(req.params.id);
  if (!employer) throw ApiError.notFound("Employer not found");

  employer.isVerified = Boolean(req.body.verified);
  await employer.save();

  let company = null;
  if (employer.company) {
    company = await Company.findById(employer.company);
    if (company) {
      company.isVerified = Boolean(req.body.verified);
      await company.save();
    }
  }

  await notifyUser({
    user: employer,
    title: employer.isVerified ? "Account verified" : "Verification removed",
    body: employer.isVerified
      ? "Your employer account is verified."
      : "Your employer account is no longer verified.",
    type: "account",
    link: "/profile",
  });

  const payload = { ...publicUser(employer), companyDetails: company ? publicCompany(company) : null };

  return okResource(res, "employer", payload, "Employer verification updated");
}

/** GET /api/admin/users */
export async function listUsers(req, res) {
  const { page, limit, skip } = readPagination(req.query);
  const { q, role } = req.query;

  const filter = {};
  if (role) filter.role = role;
  if (q && String(q).trim()) {
    const pattern = new RegExp(String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: pattern }, { email: pattern }];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  return okList(res, "users", users.map(publicUser), buildMeta({ page, limit, total }));
}

/** PATCH /api/admin/users/:id */
export async function updateUser(req, res) {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound("User not found");

  if (req.body.role !== undefined) user.role = req.body.role;
  if (req.body.suspended !== undefined) user.isSuspended = Boolean(req.body.suspended);

  await user.save();

  return okResource(res, "user", publicUser(user), "User updated");
}

/** GET /api/admin/jobs */
export async function listAllJobs(req, res) {
  const { page, limit, skip } = readPagination(req.query);

  const filter = {};
  if (req.query.status) filter.status = req.query.status;

  const [jobs, total] = await Promise.all([
    Job.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate(JOB_POPULATE),
    Job.countDocuments(filter),
  ]);

  return okList(res, "jobs", jobs.map(publicJob), buildMeta({ page, limit, total }));
}

/* ------------------------------------------------------------------ categories */

export async function listCategories(req, res) {
  const categories = await Category.find().sort({ order: 1, name: 1 });
  return okList(res, "categories", categories.map((category) => category.toPublicJSON()), {
    page: 1,
    limit: categories.length,
    total: categories.length,
    totalPages: categories.length ? 1 : 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
}

export async function createCategory(req, res) {
  try {
    const category = await Category.create(req.body);
    return okCreated(res, "category", category.toPublicJSON(), "Category created");
  } catch (error) {
    if (error?.code === 11000) {
      throw ApiError.conflict("A category with that slug already exists", [
        { field: "slug", message: "Slug already exists" },
      ]);
    }
    throw error;
  }
}

export async function updateCategory(req, res) {
  const category = await Category.findById(req.params.id);
  if (!category) throw ApiError.notFound("Category not found");

  const body = req.body;
  for (const field of ["name", "slug", "icon", "order"]) {
    if (body[field] !== undefined) category[field] = body[field];
  }
  await category.save();

  return okResource(res, "category", category.toPublicJSON(), "Category updated");
}

export async function deleteCategory(req, res) {
  const category = await Category.findById(req.params.id);
  if (!category) throw ApiError.notFound("Category not found");

  await category.deleteOne();

  return res.status(200).json({
    success: true,
    message: "Category deleted",
    data: { id: category._id.toString() },
  });
}

/* ------------------------------------------------------------------ districts */

export async function listDistricts(req, res) {
  const districts = await District.find().sort({ order: 1, name: 1 });
  return okList(res, "districts", districts.map((district) => district.toPublicJSON()), {
    page: 1,
    limit: districts.length,
    total: districts.length,
    totalPages: districts.length ? 1 : 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
}

export async function createDistrict(req, res) {
  try {
    const district = await District.create(req.body);
    return okCreated(res, "district", district.toPublicJSON(), "District created");
  } catch (error) {
    if (error?.code === 11000) {
      throw ApiError.conflict("A district with that slug already exists", [
        { field: "slug", message: "Slug already exists" },
      ]);
    }
    throw error;
  }
}

export async function updateDistrict(req, res) {
  const district = await District.findById(req.params.id);
  if (!district) throw ApiError.notFound("District not found");

  const body = req.body;
  for (const field of ["name", "slug", "order"]) {
    if (body[field] !== undefined) district[field] = body[field];
  }
  await district.save();

  return okResource(res, "district", district.toPublicJSON(), "District updated");
}

export async function deleteDistrict(req, res) {
  const district = await District.findById(req.params.id);
  if (!district) throw ApiError.notFound("District not found");

  await district.deleteOne();

  return res.status(200).json({
    success: true,
    message: "District deleted",
    data: { id: district._id.toString() },
  });
}

export default {
  overview,
  pendingJobs,
  pendingEmployers,
  approveJob,
  rejectJob,
  verifyEmployer,
  listUsers,
  updateUser,
  listAllJobs,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listDistricts,
  createDistrict,
  updateDistrict,
  deleteDistrict,
};
