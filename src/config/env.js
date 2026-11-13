import crypto from "node:crypto";
import dotenv from "dotenv";

dotenv.config();

const number = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const list = (value, fallback) => {
  const raw = value && value.trim() ? value : fallback;
  return raw
    .split(",")
    .map((entry) => entry.trim().replace(/\/+$/, ""))
    .filter(Boolean);
};

const nodeEnv = process.env.NODE_ENV || "development";

const jwtSecretFromEnv = (process.env.JWT_SECRET || "").trim();
const jwtSecret = jwtSecretFromEnv.length >= 32 ? jwtSecretFromEnv : "";

if (!jwtSecret) {
  console.warn(
    "[config] WARNING: JWT_SECRET is missing or shorter than 32 characters. " +
      "A temporary secret is used, so every restart signs out all sessions."
  );
}

export const env = Object.freeze({
  nodeEnv,
  isProduction: nodeEnv === "production",
  port: number(process.env.PORT, 5000),
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/job-portal",
  clientOrigins: list(process.env.CLIENT_ORIGIN, "http://localhost:5173"),
  jwtSecret: jwtSecret || crypto.randomBytes(48).toString("hex"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  uploadDir: process.env.UPLOAD_DIR || "uploads",
  maxCvSizeMb: number(process.env.MAX_CV_SIZE_MB, 5),
});

export default env;
