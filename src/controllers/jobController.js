import Company from "../models/Company.js";
import Job from "../models/Job.js";
import SavedJob from "../models/SavedJob.js";
import User from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { buildMeta, escapeRegex, readPagination } from "../utils/pagination.js";
import { okCreated, okList, okResource } from "../utils/response.js";
import { publicJob } from "../utils/serialize.js";

const POPULATE = [
  { path: "company" },
  { path: "employer", select: "name email phone district avatarUrl role" },
];

/** Map one row of the aggregation result into the public job shape. */
function mapAggregated(row) {
  const employer = Array.isArray(row.employerData) ? row.employerData[0] : row.employerData;
  const company = Array.isArray(row.companyData) ? row.companyData[0] : row.companyData;

  return publicJob({
    _id: row._id,
    title: row.title,
    category: row.category,
    description: row.description,
    responsibilities: row.responsibilities,
    qualifications: row.qualifications,
    experienceRequired: row.experienceRequired,
    experienceLevel: row.experienceLevel,
    educationLevel: row.educationLevel,
    skills: row.skills,
    location: row.location,
    district: row.district,
    employmentType: row.employmentType,
    workMode: row.workMode,
    salaryMin: row.salaryMin,
    salaryMax: row.salaryMax,
    salaryNegotiable: row.salaryNegotiable,
    benefits: row.benefits,
    vacancies: row.vacancies,
    deadline: row.deadline,
    status: row.status,
    isFeatured: row.isFeatured,
    employer: employer || null,
    company: company || null,
    applicationsCount: row.applicationsCount,
    views: row.views,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

/**
 * GET /api/jobs
 * Public catalogue. Only approved jobs are visible.
 */
export async function listJobs(req, res) {
  const { page, limit, skip } = readPagination(req.query);
  const {
    q,
    category,
    district,
    salaryMin,
    salaryMax,
    employmentType,
    workMode,
    experienceLevel,
    educationLevel,
    sort = "newest",
  } = req.query;

  const match = { status: "approved" };

  if (category) match.category = category;
  if (district) match.district = district;
  if (employmentType) match.employmentType = employmentType;
  if (workMode) match.workMode = workMode;
  if (experienceLevel) match.experienceLevel = experienceLevel;
  if (educationLevel) match.educationLevel = educationLevel;

  // A job matches when its own salary range overlaps the requested range.
  const minSalary = Number.parseFloat(salaryMin);
  const maxSalary = Number.parseFloat(salaryMax);
  if (Number.isFinite(minSalary) || Number.isFinite(maxSalary)) {
    match.salaryMax = {};
    if (Number.isFinite(minSalary)) match.salaryMax.$gte = minSalary;
    if (Number.isFinite(maxSalary)) match.salaryMin = { $lte: maxSalary };
  }

  let searchPattern = null;
  if (q && String(q).trim()) {
    const pattern = new RegExp(escapeRegex(String(q).trim()), "i");
    searchPattern = pattern;

    // Company and employer names live in other collections: resolve them first.
    const [companyMatches, employerMatches] = await Promise.all([
      Company.find({ name: pattern }).select("_id").lean(),
      User.find({ name: pattern }).select("_id").lean(),
    ]);

    match.$or = [
      { title: pattern },
      { description: pattern },
      { skills: pattern },
      { company: { $in: companyMatches.map((company) => company._id) } },
      { employer: { $in: employerMatches.map((user) => user._id) } },
    ];
  }

  const pipeline = [{ $match: match }];

  // "relevant" ranks a title match above a category match.
  if (sort === "relevant" && searchPattern) {
    const patternSource = escapeRegex(String(q).trim());
    pipeline.push({
      $addFields: {
        relevance: {
          $add: [
            {
              $cond: [
                {
                  $regexMatch: {
                    input: { $ifNull: ["$title", ""] },
                    regex: patternSource,
                    options: "i",
                  },
                },
                6,
                0,
              ],
            },
            {
              $cond: [
                {
                  $regexMatch: {
                    input: { $ifNull: ["$title", ""] },
                    regex: `^${patternSource}`,
                    options: "i",
                  },
                },
                4,
                0,
              ],
            },
            {
              $cond: [
                {
                  $regexMatch: {
                    input: { $ifNull: ["$category", ""] },
                    regex: patternSource,
                    options: "i",
                  },
                },
                1,
                0,
              ],
            },
          ],
        },
      },
    });
  }

  if (sort === "salary_asc") pipeline.push({ $sort: { salaryMin: 1, createdAt: -1 } });
  else if (sort === "salary_desc") pipeline.push({ $sort: { salaryMax: -1, createdAt: -1 } });
  else if (sort === "relevant" && searchPattern) pipeline.push({ $sort: { relevance: -1, createdAt: -1 } });
  else pipeline.push({ $sort: { createdAt: -1 } });

  pipeline.push(
    { $skip: skip },
    { $limit: limit },
    {
      $lookup: {
        from: "companies",
        localField: "company",
        foreignField: "_id",
        as: "companyData",
        pipeline: [{ $project: { name: 1, logoUrl: 1, industry: 1, district: 1, description: 1, isVerified: 1 } }],
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "employer",
        foreignField: "_id",
        as: "employerData",
        pipeline: [
          { $project: { name: 1, email: 1, phone: 1, district: 1, avatarUrl: 1, role: 1 } },
        ],
      },
    },
    { $unwind: { path: "$companyData", preserveNullAndEmptyArrays: true } },
    { $unwind: { path: "$employerData", preserveNullAndEmptyArrays: true } }
  );

  const [rows, total] = await Promise.all([
    Job.aggregate(pipeline),
    Job.countDocuments(match),
  ]);

  return okList(res, "jobs", rows.map(mapAggregated), buildMeta({ page, limit, total }));
}

/** GET /api/jobs/featured - up to six approved and featured jobs. */
export async function getFeaturedJobs(req, res) {
  const jobs = await Job.find({ status: "approved", isFeatured: true })
    .sort({ createdAt: -1 })
    .limit(6)
    .populate(POPULATE);

  return okList(
    res,
    "jobs",
    jobs.map(publicJob),
    buildMeta({ page: 1, limit: 6, total: jobs.length })
  );
}

/**
 * GET /api/jobs/:id
 * Approved jobs are public, the owning employer can always read their own,
 * an admin can always read any. Everybody else gets a 404.
 */
export async function getJobById(req, res) {
  const job = await Job.findById(req.params.id).populate(POPULATE);
  if (!job) throw ApiError.notFound("Job not found");

  const viewer = req.user;
  const isOwner = viewer && viewer._id.toString() === job.employer._id?.toString();
  const isAdmin = viewer?.role === "admin";

  if (job.status !== "approved" && !isOwner && !isAdmin) {
    throw ApiError.notFound("Job not found");
  }

  await Job.updateOne({ _id: job._id }, { $inc: { views: 1 } });
  job.views = (job.views ?? 0) + 1;

  return okResource(res, "job", publicJob(job));
}

/** GET /api/jobs/mine - every job of the signed in employer, any status. */
export async function getMyJobs(req, res) {
  const { page, limit, skip } = readPagination(req.query);

  const filter = { employer: req.user._id };
  if (req.query.status) filter.status = req.query.status;

  const [jobs, total] = await Promise.all([
    Job.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate(POPULATE),
    Job.countDocuments(filter),
  ]);

  return okList(res, "jobs", jobs.map(publicJob), buildMeta({ page, limit, total }));
}

/** POST /api/jobs - employer only. */
export async function createJob(req, res) {
  if (!req.user.company) {
    throw ApiError.badRequest("Your employer account has no company linked yet");
  }

  const body = req.body;
  // Employers may only post a draft or send it for review - never approve it.
  const status = body.status === "draft" ? "draft" : "pending";

  const job = await Job.create({
    title: body.title,
    category: body.category,
    description: body.description,
    responsibilities: body.responsibilities || "",
    qualifications: body.qualifications || "",
    experienceRequired: body.experienceRequired || "",
    experienceLevel: body.experienceLevel || "entry",
    educationLevel: body.educationLevel || "any",
    skills: body.skills || [],
    location: body.location || "",
    district: body.district || "",
    employmentType: body.employmentType || "full-time",
    workMode: body.workMode || "onsite",
    salaryMin: body.salaryMin ?? 0,
    salaryMax: body.salaryMax ?? 0,
    salaryNegotiable: Boolean(body.salaryNegotiable),
    benefits: body.benefits || "",
    vacancies: body.vacancies ?? 1,
    deadline: body.deadline ? new Date(body.deadline) : null,
    status,
    isFeatured: false,
    employer: req.user._id,
    company: req.user.company,
    applicationsCount: 0,
    views: 0,
  });

  const populated = await Job.findById(job._id).populate(POPULATE);
  return okCreated(res, "job", publicJob(populated), "Job created");
}

/** PATCH /api/jobs/:id - the owning employer or an admin. */
export async function updateJob(req, res) {
  const job = await Job.findById(req.params.id);
  if (!job) throw ApiError.notFound("Job not found");

  const isOwner = job.employer.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== "admin") {
    throw ApiError.forbidden("You do not have permission to do this");
  }

  const body = req.body;
  const fields = [
    "title",
    "category",
    "description",
    "responsibilities",
    "qualifications",
    "experienceRequired",
    "experienceLevel",
    "educationLevel",
    "skills",
    "location",
    "district",
    "employmentType",
    "workMode",
    "salaryMin",
    "salaryMax",
    "salaryNegotiable",
    "benefits",
    "vacancies",
  ];

  for (const field of fields) {
    if (body[field] !== undefined) job[field] = body[field];
  }
  if (body.deadline !== undefined) job.deadline = body.deadline ? new Date(body.deadline) : null;
  if (body.status !== undefined) job.status = body.status;

  await job.save();

  const populated = await Job.findById(job._id).populate(POPULATE);
  return okResource(res, "job", publicJob(populated), "Job updated");
}

/** DELETE /api/jobs/:id - the owning employer or an admin. */
export async function deleteJob(req, res) {
  const job = await Job.findById(req.params.id);
  if (!job) throw ApiError.notFound("Job not found");

  const isOwner = job.employer.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== "admin") {
    throw ApiError.forbidden("You do not have permission to do this");
  }

  await job.deleteOne();

  return res.status(200).json({
    success: true,
    message: "Job deleted",
    data: { id: job._id.toString() },
  });
}

/** POST /api/jobs/:id/save - seeker only. */
export async function saveJob(req, res) {
  const job = await Job.findById(req.params.id);
  if (!job) throw ApiError.notFound("Job not found");

  const existing = await SavedJob.findOne({ user: req.user._id, job: job._id });
  if (!existing) {
    await SavedJob.create({ user: req.user._id, job: job._id });
  }

  return res.status(200).json({ success: true, saved: true, data: { saved: true } });
}

/** DELETE /api/jobs/:id/save - seeker only. */
export async function unsaveJob(req, res) {
  const job = await Job.findById(req.params.id);
  if (!job) throw ApiError.notFound("Job not found");

  await SavedJob.deleteOne({ user: req.user._id, job: job._id });

  return res.status(200).json({ success: true, saved: false, data: { saved: false } });
}

/** GET /api/jobs/saved - seeker only. */
export async function getSavedJobs(req, res) {
  const { page, limit, skip } = readPagination(req.query);

  const [saved, total] = await Promise.all([
    SavedJob.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: "job", populate: POPULATE }),
    SavedJob.countDocuments({ user: req.user._id }),
  ]);

  const jobs = saved.map((entry) => (entry.job ? publicJob(entry.job) : null)).filter(Boolean);

  return okList(res, "jobs", jobs, buildMeta({ page, limit, total }));
}

export default {
  listJobs,
  getFeaturedJobs,
  getJobById,
  getMyJobs,
  createJob,
  updateJob,
  deleteJob,
  saveJob,
  unsaveJob,
  getSavedJobs,
};
