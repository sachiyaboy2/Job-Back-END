import { Router } from "express";
import * as cvController from "../controllers/cvController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { uploadCv } from "../middleware/upload.js";
import { idRules } from "../validators/adminValidators.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.post("/", requireAuth, requireRole("seeker"), uploadCv, cvController.uploadCV);
router.get("/mine", requireAuth, requireRole("seeker"), cvController.getMyCVs);
router.get("/:id", requireAuth, idRules, validate, cvController.getCV);
router.delete("/:id", requireAuth, idRules, validate, cvController.deleteCV);

export default router;
