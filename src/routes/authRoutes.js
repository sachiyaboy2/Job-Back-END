import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import * as authController from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { loginRules, registerRules } from "../validators/authValidators.js";

const router = Router();

// 10 attempts per 15 minutes per IP slows password guessing.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many attempts. Please try again in a few minutes.",
    error: { message: "Too many attempts. Please try again in a few minutes.", statusCode: 429 },
  },
});

router.post("/register", authLimiter, registerRules, validate, authController.register);
router.post("/login", authLimiter, loginRules, validate, authController.login);
router.get("/me", requireAuth, authController.me);

export default router;
