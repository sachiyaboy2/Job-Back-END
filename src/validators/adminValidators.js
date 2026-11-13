import { body, param, query } from "express-validator";
import { ROLES, JOB_STATUSES } from "../utils/constants.js";

export const reviewJobRules = [
  body("reason").optional().trim().isLength({ max: 1000 }).withMessage("Reason is too long"),
];

export const verifyEmployerRules = [
  body("verified")
    .notEmpty()
    .withMessage("verified is required")
    .bail()
    .isBoolean()
    .withMessage("verified must be true or false")
    .toBoolean(),
];

export const updateUserRules = [
  body("role").optional().isIn(ROLES).withMessage(`Role must be one of ${ROLES.join(", ")}`),
  body("suspended").optional().isBoolean().withMessage("suspended must be true or false").toBoolean(),
];

export const listUsersRules = [
  query("q").optional().isString().withMessage("q must be a string"),
  query("role").optional().isIn(ROLES).withMessage(`Role must be one of ${ROLES.join(", ")}`),
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be an integer >= 1"),
  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),
];

export const listAdminJobsRules = [
  query("status").optional().isIn(JOB_STATUSES).withMessage("Invalid status"),
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be an integer >= 1"),
  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),
];

export const createCategoryRules = [
  body("name").trim().notEmpty().withMessage("Name is required").bail().isLength({ max: 100 }),
  body("slug").optional().trim().isLength({ max: 120 }),
  body("icon").optional().trim().isLength({ max: 120 }),
  body("order").optional().isInt({ min: 0 }).withMessage("Order must be 0 or more").toInt(),
];

export const updateCategoryRules = [
  body("name").optional().trim().notEmpty().withMessage("Name cannot be empty").bail().isLength({ max: 100 }),
  body("slug").optional().trim().isLength({ max: 120 }),
  body("icon").optional().trim().isLength({ max: 120 }),
  body("order").optional().isInt({ min: 0 }).withMessage("Order must be 0 or more").toInt(),
];

export const createDistrictRules = [
  body("name").trim().notEmpty().withMessage("Name is required").bail().isLength({ max: 100 }),
  body("slug").optional().trim().isLength({ max: 120 }),
  body("order").optional().isInt({ min: 0 }).withMessage("Order must be 0 or more").toInt(),
];

export const updateDistrictRules = [
  body("name").optional().trim().notEmpty().withMessage("Name cannot be empty").bail().isLength({ max: 100 }),
  body("slug").optional().trim().isLength({ max: 120 }),
  body("order").optional().isInt({ min: 0 }).withMessage("Order must be 0 or more").toInt(),
];

export const idRules = [
  param("id").trim().notEmpty().withMessage("Id is required").bail().isMongoId().withMessage("Invalid id"),
];

export default {
  reviewJobRules,
  verifyEmployerRules,
  updateUserRules,
  listUsersRules,
  listAdminJobsRules,
  createCategoryRules,
  updateCategoryRules,
  createDistrictRules,
  updateDistrictRules,
  idRules,
};
