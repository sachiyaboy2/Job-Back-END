export const ROLES = ["seeker", "employer", "admin"];

export const EMPLOYMENT_TYPES = ["full-time", "part-time", "contract", "internship", "temporary"];

export const WORK_MODES = ["onsite", "remote", "hybrid"];

export const JOB_STATUSES = ["draft", "pending", "approved", "rejected", "closed"];

export const JOB_SORTS = ["newest", "salary_asc", "salary_desc", "relevant"];

export const EXPERIENCE_LEVELS = ["entry", "mid", "senior", "executive"];

export const EDUCATION_LEVELS = [
  "any",
  "certificate",
  "diploma",
  "bachelors",
  "masters",
  "doctorate",
];

export const APPLICATION_STATUSES = [
  "applied",
  "shortlisted",
  "interview",
  "rejected",
  "hired",
  "withdrawn",
];

export const EMPLOYER_SETTABLE_STATUSES = ["applied", "shortlisted", "interview", "rejected", "hired"];

export const NOTIFICATION_TYPES = [
  "job",
  "application",
  "account",
  "system",
];

export const AUTH_COOKIE = "jobportal_session";

export const CV_ALLOWED_EXTENSIONS = [".pdf", ".docx"];

export const CV_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export default {
  ROLES,
  EMPLOYMENT_TYPES,
  WORK_MODES,
  JOB_STATUSES,
  JOB_SORTS,
  EXPERIENCE_LEVELS,
  EDUCATION_LEVELS,
  APPLICATION_STATUSES,
  EMPLOYER_SETTABLE_STATUSES,
  NOTIFICATION_TYPES,
  AUTH_COOKIE,
  CV_ALLOWED_EXTENSIONS,
  CV_ALLOWED_MIME_TYPES,
};
