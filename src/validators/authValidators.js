import { body } from "express-validator";

export const registerRules = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .bail()
    .isLength({ min: 2, max: 120 })
    .withMessage("Name must be between 2 and 120 characters"),
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .bail()
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail({ gmail_remove_dots: false }),
  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .bail()
    .isLength({ min: 8, max: 128 })
    .withMessage("Password must be at least 8 characters")
    .bail()
    .matches(/[a-zA-Z]/)
    .withMessage("Password must contain at least one letter")
    .matches(/[0-9]/)
    .withMessage("Password must contain at least one number"),
  body("role")
    .notEmpty()
    .withMessage("Role is required")
    .bail()
    .isIn(["seeker", "employer"])
    .withMessage('Role must be either "seeker" or "employer"'),
  body("companyName")
    .optional()
    .trim()
    .isLength({ min: 2, max: 150 })
    .withMessage("Company name must be between 2 and 150 characters"),
  body("phone").optional().trim().isLength({ max: 40 }).withMessage("Phone is too long"),
  body("district").optional().trim().isLength({ max: 100 }).withMessage("District is too long"),
];

export const loginRules = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .bail()
    .isEmail()
    .withMessage("Please provide a valid email address"),
  body("password").notEmpty().withMessage("Password is required"),
];

export default { registerRules, loginRules };
