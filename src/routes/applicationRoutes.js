import { Router } from "express";
import * as applicationController from "../controllers/applicationController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  applicationIdRules,
  createApplicationRules,
  listApplicationsRules,
  updateApplicationStatusRules,
} from "../validators/applicationValidators.js";

const router = Router();

router.post("/", requireAuth, requireRole("seeker"), createApplicationRules, validate, applicationController.createApplication);
router.get("/mine", requireAuth, requireRole("seeker"), listApplicationsRules, validate, applicationController.getMyApplications);
router.get(
  "/",
  requireAuth,
  requireRole("employer", "admin"),
  listApplicationsRules,
  validate,
  applicationController.getApplicationsForJob
);

router.patch(
  "/:id/status",
  requireAuth,
  requireRole("employer", "admin"),
  applicationIdRules,
  validate,
  updateApplicationStatusRules,
  validate,
  applicationController.updateApplicationStatus
);
router.delete(
  "/:id",
  requireAuth,
  applicationIdRules,
  validate,
  applicationController.deleteApplication
);

export default router;
