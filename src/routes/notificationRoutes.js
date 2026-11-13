import { Router } from "express";
import * as notificationController from "../controllers/notificationController.js";
import { requireAuth } from "../middleware/auth.js";
import { idRules } from "../validators/adminValidators.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.use(requireAuth);

router.get("/", notificationController.listNotifications);
router.post("/read-all", notificationController.markAllRead);
router.patch("/:id/read", idRules, validate, notificationController.markRead);

export default router;
