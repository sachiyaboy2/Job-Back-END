import { body, param, query } from "express-validator";
import {
  EMPLOYMENT_TYPES,
  WORK_MODES,
  JOB_SORTS,
  EXPERIENCE_LEVELS,
  EDUCATION_LEVELS,
} from "../utils/constants.js";

const skillList = body("skills")
  .optional({ values: "null" })
  .isArray()
  .withMessage("Skills must be an array of strings")
  .bail()
  .custom((value) => value.every((skill) => typeof skill === "string" && skill.trim().length > 0))
  .withMessage("Skills must be an array of non-empty strings")
  .bail()
  .customSanitizer((value) => value.map((skill) => skill.trim()));

export const createJobRules = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .bail()
    .isLength({ min: 2, max: 150 })
    .withMessage("Title must be between 2 and 150 characters"),
  body("category")
    .trim()
    .notEmpty()
    .withMessage("Category is required")
    .bail()
    .isLength({ max: 100 })
    .withMessage("Category is too long"),
  body("description")
    .trim()
    .notEmpty()
    .withMessage("Description is required")
    .bail()
    .isLength({ min: 10, max: 5000 })
    .withMessage("Description must be between 10 and 5000 characters"),
  body("responsibilities").optional().trim().isLength({ max: 5000 }).withMessage("Responsibilities are too long"),
  body("qualifications").optional().trim().isLength({ max: 5000 }).withMessage("Qualifications are too long"),
  body("experienceRequired").optional().trim().isLength({ max: 200 }).withMessage("Experience requirement is too long"),
  body("experienceLevel").optional().isIn(EXPERIENCE_LEVELS).withMessage("Invalid experience level"),
  body("educationLevel").optional().isIn(EDUCATION_LEVELS).withMessage("Invalid education level"),
  skillList,
  body("location").optional().trim().isLength({ max: 200 }).withMessage("Location is too long"),
  body("district").optional().trim().isLength({ max: 100 }).withMessage("District is too long"),
  body("employmentType")
    .optional()
    .isIn(EMPLOYMENT_TYPES)
    .withMessage("Invalid employment type"),
  body("workMode").optional().isIn(WORK_MODES).withMessage("Invalid work mode"),
  body("salaryMin").optional().isFloat({ min: 0 }).withMessage("salaryMin must be a number >= 0").toFloat(),
  body("salaryMax").optional().isFloat({ min: 0 }).withMessage("salaryMax must be a number >= 0").toFloat(),
  body("salaryNegotiable").optional().isBoolean().withMessage("salaryNegotiable must be true or false"),
  body("benefits").optional().trim().isLength({ max: 2000 }).withMessage("Benefits are too long"),
  body("vacancies").optional().isInt({ min: 1, max: 1000 }).withMessage("Vacancies must be between 1 and 1000").toInt(),
  body("deadline").optional({ values: "null" }).isISO8601().withMessage("Deadline must be a valid date"),
  body("status")
    .optional()
    .isIn(["draft", "pending"])
    .withMessage('Status must be either "draft" or "pending"'),
];

export const updateJobRules = [
  body("title")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Title cannot be empty")
    .bail()
    .isLength({ min: 2, max: 150 })
    .withMessage("Title must be between 2 and 150 characters"),
  body("category").optional().trim().notEmpty().withMessage("Category cannot be empty").isLength({ max: 100 }),
  body("description")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Description cannot be empty")
    .bail()
    .isLength({ min: 10, max: 5000 })
    .withMessage("Description must be between 10 and 5000 characters"),
  body("responsibilities").optional().trim().isLength({ max: 5000 }),
  body("qualifications").optional().trim().isLength({ max: 5000 }),
  body("experienceRequired").optional().trim().isLength({ max: 200 }),
  body("experienceLevel").optional().isIn(EXPERIENCE_LEVELS).withMessage("Invalid experience level"),
  body("educationLevel").optional().isIn(EDUCATION_LEVELS).withMessage("Invalid education level"),
  skillList,
  body("location").optional().trim().isLength({ max: 200 }),
  body("district").optional().trim().isLength({ max: 100 }),
  body("employmentType").optional().isIn(EMPLOYMENT_TYPES).withMessage("Invalid employment type"),
  body("workMode").optional().isIn(WORK_MODES).withMessage("Invalid work mode"),
  body("salaryMin").optional().isFloat({ min: 0 }).withMessage("salaryMin must be a number >= 0").toFloat(),
  body("salaryMax").optional().isFloat({ min: 0 }).withMessage("salaryMax must be a number >= 0").toFloat(),
  body("salaryNegotiable").optional().isBoolean().withMessage("salaryNegotiable must be true or false"),
  body("benefits").optional().trim().isLength({ max: 2000 }),
  body("vacancies").optional().isInt({ min: 1, max: 1000 }).withMessage("Vacancies must be between 1 and 1000").toInt(),
  body("deadline").optional({ values: "null" }).isISO8601().withMessage("Deadline must be a valid date"),
  body("status")
    .optional()
    .isIn(["draft", "pending"])
    .withMessage('Status must be either "draft" or "pending"'),
];

export const listJobsRules = [
  query("q").optional().isString().withMessage("q must be a string"),
  query("category").optional().isString().withMessage("category must be a string"),
  query("district").optional().isString().withMessage("district must be a string"),
  query("salaryMin").optional().isFloat({ min: 0 }).withMessage("salaryMin must be a number >= 0"),
  query("salaryMax").optional().isFloat({ min: 0 }).withMessage("salaryMax must be a number >= 0"),
  query("employmentType").optional().isIn(EMPLOYMENT_TYPES).withMessage("Invalid employment type"),
  query("workMode").optional().isIn(WORK_MODES).withMessage("Invalid work mode"),
  query("experienceLevel").optional().isIn(EXPERIENCE_LEVELS).withMessage("Invalid experience level"),
  query("educationLevel").optional().isIn(EDUCATION_LEVELS).withMessage("Invalid education level"),
  query("sort").optional().isIn(JOB_SORTS).withMessage("Invalid sort option"),
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be an integer >= 1"),
  query("limit").optional().isInt({ min: 1, max: 50 }).withMessage("Limit must be between 1 and 50"),
];

export const jobIdRules = [
  param("id").trim().notEmpty().withMessage("Job id is required").bail().isMongoId().withMessage("Invalid job id"),
];

export default { createJobRules, updateJobRules, listJobsRules, jobIdRules };
