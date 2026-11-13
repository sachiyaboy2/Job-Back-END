import { body, param, query } from "express-validator";
import { EMPLOYER_SETTABLE_STATUSES, APPLICATION_STATUSES } from "../utils/constants.js";

export const createApplicationRules = [
  body("jobId")
    .trim()
    .notEmpty()
    .withMessage("jobId is required")
    .bail()
    .isMongoId()
    .withMessage("Invalid job id"),
  body("coverLetter")
    .optional({ values: "null" })
    .trim()
    .isLength({ max: 4000 })
    .withMessage("Cover letter must be at most 4000 characters"),
  body("cvId")
    .optional({ values: "null" })
    .trim()
    .isMongoId()
    .withMessage("Invalid CV id"),
];

export const updateApplicationStatusRules = [
  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .bail()
    .isIn(EMPLOYER_SETTABLE_STATUSES)
    .withMessage(`Status must be one of ${EMPLOYER_SETTABLE_STATUSES.join(", ")}`),
  body("employerNote")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Employer note must be at most 2000 characters"),
];

export const listApplicationsRules = [
  query("jobId").optional().isMongoId().withMessage("Invalid job id"),
  query("status").optional().isIn(APPLICATION_STATUSES).withMessage("Invalid status"),
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be an integer >= 1"),
  query("limit").optional().isInt({ min: 1, max: 50 }).withMessage("Limit must be between 1 and 50"),
];

export const applicationIdRules = [
  param("id")
    .trim()
    .notEmpty()
    .withMessage("Application id is required")
    .bail()
    .isMongoId()
    .withMessage("Invalid application id"),
];

export default {
  createApplicationRules,
  updateApplicationStatusRules,
  listApplicationsRules,
  applicationIdRules,
};
