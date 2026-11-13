import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import Application from "../models/Application.js";
import CV from "../models/CV.js";
import { ApiError } from "../utils/ApiError.js";
import { okCreated, okList, okResource } from "../utils/response.js";

/** Keep the download name safe for a Content-Disposition header. */
function safeFileName(name = "cv") {
  return String(name).replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "cv";
}

/** POST /api/cv - seeker only, multipart/form-data with the field name "file". */
export async function uploadCV(req, res) {
  if (!req.file) {
    throw ApiError.badRequest("Validation failed", [
      { field: "file", message: "A CV file is required" },
    ]);
  }

  const cv = await CV.create({
    owner: req.user._id,
    originalName: req.file.originalname,
    filename: req.file.filename,
    path: req.file.path,
    mimeType: req.file.mimetype,
    size: req.file.size,
  });

  return okCreated(res, "cv", cv.toPublicJSON(), "CV uploaded");
}

/** GET /api/cv/mine - seeker only. */
export async function getMyCVs(req, res) {
  const cvs = await CV.find({ owner: req.user._id }).sort({ createdAt: -1 });

  return okList(res, "cvs", cvs.map((cv) => cv.toPublicJSON()), {
    page: 1,
    limit: cvs.length,
    total: cvs.length,
    totalPages: cvs.length ? 1 : 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
}

/**
 * GET /api/cv/:id
 * The owner, an employer looking at an applicant of their own job, or an admin.
 */
export async function getCV(req, res) {
  const cv = await CV.findById(req.params.id);
  if (!cv) throw ApiError.notFound("CV not found");

  const isOwner = cv.owner.toString() === req.user._id.toString();
  const isAdmin = req.user.role === "admin";

  let allowed = isOwner || isAdmin;

  if (!allowed && req.user.role === "employer") {
    // The employer may read the CV attached to an application for one of their jobs.
    const application = await Application.findOne({ cv: cv._id }).populate("job");
    allowed = Boolean(
      application?.job && application.job.employer.toString() === req.user._id.toString()
    );
  }

  if (!allowed) throw ApiError.forbidden("You do not have permission to view this CV");

  const absolutePath = path.isAbsolute(cv.path) ? cv.path : path.resolve(cv.path);
  if (!existsSync(absolutePath)) {
    throw ApiError.notFound("The file for this CV is missing");
  }

  res.setHeader("Content-Type", cv.mimeType);
  res.setHeader("Content-Disposition", `inline; filename="${safeFileName(cv.originalName)}"`);

  return res.sendFile(absolutePath);
}

/** DELETE /api/cv/:id - the owner or an admin. */
export async function deleteCV(req, res) {
  const cv = await CV.findById(req.params.id);
  if (!cv) throw ApiError.notFound("CV not found");

  const isOwner = cv.owner.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== "admin") {
    throw ApiError.forbidden("You do not have permission to do this");
  }

  await cv.deleteOne();

  try {
    await fs.unlink(path.isAbsolute(cv.path) ? cv.path : path.resolve(cv.path));
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("[cv] Could not remove the file from disk:", error.message);
    }
  }

  return res.status(200).json({
    success: true,
    message: "CV deleted",
    data: { id: cv._id.toString() },
  });
}

export default { uploadCV, getMyCVs, getCV, deleteCV };
