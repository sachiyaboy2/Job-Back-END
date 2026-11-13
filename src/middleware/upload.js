import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { CV_ALLOWED_EXTENSIONS, CV_ALLOWED_MIME_TYPES } from "../utils/constants.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Absolute path of the upload folder, created on first use. */
export const uploadDir = path.isAbsolute(env.uploadDir)
  ? env.uploadDir
  : path.join(projectRoot, env.uploadDir);

export function ensureUploadDir() {
  fs.mkdirSync(uploadDir, { recursive: true });
  return uploadDir;
}

const storage = multer.diskStorage({
  destination(_req, _file, callback) {
    callback(null, ensureUploadDir());
  },
  filename(_req, file, callback) {
    // Random name on disk, original name kept in the database.
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
  },
});

function fileFilter(_req, file, callback) {
  const extension = path.extname(file.originalname).toLowerCase();
  const mimeOk =
    CV_ALLOWED_MIME_TYPES.includes(file.mimetype) ||
    file.mimetype === "application/octet-stream" ||
    file.mimetype === "application/zip";

  if (!CV_ALLOWED_EXTENSIONS.includes(extension) || !mimeOk) {
    return callback(
      ApiError.badRequest("Only PDF and DOCX CV files are allowed", [
        { field: "file", message: "Allowed file types: .pdf, .docx" },
      ])
    );
  }

  return callback(null, true);
}

export const uploadCv = multer({
  storage,
  fileFilter,
  limits: { fileSize: env.maxCvSizeMb * 1024 * 1024, files: 1 },
}).single("file");

export default { uploadCv, uploadDir, ensureUploadDir };
