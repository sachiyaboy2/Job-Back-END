import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import * as contactController from "../controllers/contactController.js";
import { validate } from "../middleware/validate.js";
import { contactRules } from "../validators/contactValidators.js";

const router = Router();

// 5 messages per 15 minutes per IP keeps the contact form from being spammed.
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many messages. Please try again later.",
    error: { message: "Too many messages. Please try again later.", statusCode: 429 },
  },
});

router.post("/", contactLimiter, contactRules, validate, contactController.sendMessage);

export default router;
