import { Router } from "express";
import * as adminController from "../controllers/adminController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createCategoryRules,
  createDistrictRules,
  idRules,
  listAdminJobsRules,
  listUsersRules,
  reviewJobRules,
  updateCategoryRules,
  updateDistrictRules,
  updateUserRules,
  verifyEmployerRules,
} from "../validators/adminValidators.js";

const router = Router();

// Everything under /api/admin is for admins only.
router.use(requireAuth, requireRole("admin"));

router.get("/overview", adminController.overview);

router.get("/pending-jobs", adminController.pendingJobs);
router.get("/pending-employers", adminController.pendingEmployers);

router.get("/jobs", listAdminJobsRules, validate, adminController.listAllJobs);
router.post("/jobs/:id/approve", idRules, validate, reviewJobRules, validate, adminController.approveJob);
router.post("/jobs/:id/reject", idRules, validate, reviewJobRules, validate, adminController.rejectJob);

router.patch("/employers/:id/verify", idRules, validate, verifyEmployerRules, validate, adminController.verifyEmployer);

router.get("/users", listUsersRules, validate, adminController.listUsers);
router.patch("/users/:id", idRules, validate, updateUserRules, validate, adminController.updateUser);

router.get("/categories", adminController.listCategories);
router.post("/categories", createCategoryRules, validate, adminController.createCategory);
router.patch("/categories/:id", idRules, validate, updateCategoryRules, validate, adminController.updateCategory);
router.delete("/categories/:id", idRules, validate, adminController.deleteCategory);

router.get("/districts", adminController.listDistricts);
router.post("/districts", createDistrictRules, validate, adminController.createDistrict);
router.patch("/districts/:id", idRules, validate, updateDistrictRules, validate, adminController.updateDistrict);
router.delete("/districts/:id", idRules, validate, adminController.deleteDistrict);

export default router;
