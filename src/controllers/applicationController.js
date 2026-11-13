import Application from "../models/Application.js";
import CV from "../models/CV.js";
import Job from "../models/Job.js";
import User from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { buildMeta, readPagination } from "../utils/pagination.js";
import { notifyUser } from "../utils/notify.js";
import { okCreated, okList, okResource } from "../utils/response.js";
import { publicJob, publicUser } from "../utils/serialize.js";

/**
 * POST /api/applications
 * Seeker only. { jobId, coverLetter?, cvId? }
 */
export async function createApplication(req, res) {
  const { jobId, coverLetter, cvId } = req.body;

  const job = await Job.findById(jobId);
  if (!job) throw ApiError.notFound("Job not found");

  if (job.status !== "approved") {
    throw ApiError.badRequest("This job is not open for applications");
  }
  if (job.deadline && new Date(job.deadline) < new Date()) {
    throw ApiError.badRequest("This job is no longer accepting applications");
  }

  const duplicate = await Application.findOne({ job: job._id, seeker: req.user._id });
  if (duplicate) {
    throw ApiError.conflict("You have already applied for this job", [
      { field: "jobId", message: "An application for this job already exists" },
    ]);
  }

  let cv = null;
  if (cvId) {
    cv = await CV.findById(cvId);
    if (!cv) throw ApiError.badRequest("The CV you selected no longer exists");
    if (cv.owner.toString() !== req.user._id.toString()) {
      throw ApiError.forbidden("You can only attach your own CV");
    }
  }

  const application = await Application.create({
    job: job._id,
    seeker: req.user._id,
    cv: cv ? cv._id : null,
    coverLetter: coverLetter || "",
    status: "applied",
  });

  await Job.updateOne({ _id: job._id }, { $inc: { applicationsCount: 1 } });

  const employer = await User.findById(job.employer);
  await notifyUser({
    user: employer,
    title: "New application",
    body: `A seeker applied for "${job.title}".`,
    type: "application",
    link: `/admin/applications?jobId=${job._id}`,
  });

  const populated = await Application.findById(application._id).populate({
    path: "job",
    populate: [{ path: "company" }, { path: "employer", select: "name email phone district avatarUrl role" }],
  });

  return okCreated(res, "application", applicationPayload(populated), "Application submitted");
}

/** Shape of an application, with the job joined in. */
function applicationPayload(application) {
  const source = application.toObject ? application.toObject() : application;

  return {
    id: source._id?.toString(),
    job: source.job ? publicJob(source.job) : null,
    jobId: source.job?._id?.toString() ?? source.jobId ?? null,
    seeker: source.seeker ? publicUser(source.seeker) : null,
    seekerId: source.seeker?._id?.toString() ?? source.seekerId ?? null,
    cv: source.cv ? source.cv.toString() : null,
    coverLetter: source.coverLetter || "",
    status: source.status,
    employerNote: source.employerNote || "",
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

/** GET /api/applications/mine - seeker only. */
export async function getMyApplications(req, res) {
  const { page, limit, skip } = readPagination(req.query);

  const filter = { seeker: req.user._id };
  if (req.query.status) filter.status = req.query.status;

  const [applications, total] = await Promise.all([
    Application.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "job",
        populate: [{ path: "company" }, { path: "employer", select: "name email phone district avatarUrl role" }],
      }),
    Application.countDocuments(filter),
  ]);

  return okList(
    res,
    "applications",
    applications.map(applicationPayload),
    buildMeta({ page, limit, total })
  );
}

/**
 * GET /api/applications?jobId=
 * Employer only: the applications for one of their own jobs.
 * The applicant contact details are included on purpose.
 */
export async function getApplicationsForJob(req, res) {
  const { page, limit, skip } = readPagination(req.query);
  const { jobId } = req.query;

  if (!jobId) {
    throw ApiError.badRequest("Validation failed", [
      { field: "jobId", message: "jobId is required" },
    ]);
  }

  const job = await Job.findById(jobId);
  if (!job) throw ApiError.notFound("Job not found");

  const isOwner = job.employer.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== "admin") {
    throw ApiError.forbidden("You do not have permission to do this");
  }

  const filter = { job: job._id };
  if (req.query.status) filter.status = req.query.status;

  const [applications, total] = await Promise.all([
    Application.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("seeker"),
    Application.countDocuments(filter),
  ]);

  return okList(
    res,
    "applications",
    applications.map(applicationPayload),
    buildMeta({ page, limit, total })
  );
}

/**
 * PATCH /api/applications/:id/status
 * The employer who owns the job, or an admin.
 */
export async function updateApplicationStatus(req, res) {
  const application = await Application.findById(req.params.id).populate("job");
  if (!application) throw ApiError.notFound("Application not found");

  const job = application.job;
  const isOwner = job && job.employer.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== "admin") {
    throw ApiError.forbidden("You do not have permission to do this");
  }

  application.status = req.body.status;
  if (req.body.employerNote !== undefined) application.employerNote = req.body.employerNote;
  await application.save();

  await notifyUser({
    user: application.seeker,
    title: `Application ${req.body.status}`,
    body: `Your application for "${job?.title || "a job"}" is now ${req.body.status}.`,
    type: "application",
    link: `/applications/${application._id}`,
  });

  const populated = await Application.findById(application._id).populate({
    path: "job",
    populate: [{ path: "company" }, { path: "employer", select: "name email phone district avatarUrl role" }],
  });

  return okResource(res, "application", applicationPayload(populated), "Application updated");
}

/**
 * DELETE /api/applications/:id
 * The seeker withdraws their own application, or an employer/admin removes it.
 */
export async function deleteApplication(req, res) {
  const application = await Application.findById(req.params.id).populate("job");
  if (!application) throw ApiError.notFound("Application not found");

  const isOwnerSeeker = application.seeker.toString() === req.user._id.toString();
  const job = application.job;
  const isJobOwner = job && job.employer.toString() === req.user._id.toString();
  const isAdmin = req.user.role === "admin";

  if (!isOwnerSeeker && !isJobOwner && !isAdmin) {
    throw ApiError.forbidden("You do not have permission to do this");
  }

  await application.deleteOne();

  if (isOwnerSeeker) {
    await Job.updateOne({ _id: application.job?._id }, { $inc: { applicationsCount: -1 } });
  }

  return res.status(200).json({
    success: true,
    message: "Application deleted",
    data: { id: application._id.toString() },
  });
}

export default {
  createApplication,
  getMyApplications,
  getApplicationsForJob,
  updateApplicationStatus,
  deleteApplication,
};
