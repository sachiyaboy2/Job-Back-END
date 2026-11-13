import { Router } from "express";
import * as jobController from "../controllers/jobController.js";
import { optionalAuth, requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createJobRules, jobIdRules, listJobsRules, updateJobRules } from "../validators/jobValidators.js";

const router = Router();

// Static paths first - they would otherwise be swallowed by "/:id".
router.get("/featured", jobController.getFeaturedJobs);
router.get("/mine", requireAuth, requireRole("employer"), jobController.getMyJobs);
router.get("/saved", requireAuth, requireRole("seeker"), jobController.getSavedJobs);

router.get("/", listJobsRules, validate, jobController.listJobs);
router.post("/", requireAuth, requireRole("employer"), createJobRules, validate, jobController.createJob);

router.get("/:id", optionalAuth, jobIdRules, validate, jobController.getJobById);

router.post("/:id/save", requireAuth, requireRole("seeker"), jobIdRules, validate, jobController.saveJob);
router.delete("/:id/save", requireAuth, requireRole("seeker"), jobIdRules, validate, jobController.unsaveJob);

router.patch(
  "/:id",
  requireAuth,
  requireRole("employer", "admin"),
  jobIdRules,
  validate,
  updateJobRules,
  validate,
  jobController.updateJob
);
router.delete(
  "/:id",
  requireAuth,
  requireRole("employer", "admin"),
  jobIdRules,
  validate,
  jobController.deleteJob
);

export default router;
