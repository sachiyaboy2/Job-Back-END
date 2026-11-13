import { body, query } from "express-validator";

export const updateCompanyRules = [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Company name cannot be empty")
    .bail()
    .isLength({ min: 2, max: 150 })
    .withMessage("Company name must be between 2 and 150 characters"),
  body("logoUrl").optional().trim().isLength({ max: 500 }).withMessage("Logo URL is too long"),
  body("description").optional().trim().isLength({ max: 2000 }).withMessage("Description is too long"),
  body("industry").optional().trim().isLength({ max: 120 }).withMessage("Industry is too long"),
  body("address").optional().trim().isLength({ max: 300 }).withMessage("Address is too long"),
  body("district").optional().trim().isLength({ max: 100 }).withMessage("District is too long"),
  body("website").optional().trim().isLength({ max: 300 }).withMessage("Website is too long"),
  body("contactPerson").optional().trim().isLength({ max: 120 }).withMessage("Contact person is too long"),
  body("contactEmail")
    .optional({ values: "null" })
    .trim()
    .isEmail()
    .withMessage("Contact email must be a valid email address")
    .normalizeEmail({ gmail_remove_dots: false }),
  body("contactPhone").optional().trim().isLength({ max: 40 }).withMessage("Contact phone is too long"),
];

export const listCompaniesRules = [
  query("q").optional().isString().withMessage("q must be a string"),
  query("district").optional().isString().withMessage("district must be a string"),
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be an integer >= 1"),
  query("limit").optional().isInt({ min: 1, max: 50 }).withMessage("Limit must be between 1 and 50"),
];

export default { updateCompanyRules, listCompaniesRules };
