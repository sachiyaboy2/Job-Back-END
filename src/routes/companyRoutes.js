import { Router } from "express";
import * as companyController from "../controllers/companyController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { listCompaniesRules, updateCompanyRules } from "../validators/companyValidators.js";

const router = Router();

router.get("/", listCompaniesRules, validate, companyController.listCompanies);
router.patch("/me", requireAuth, requireRole("employer"), updateCompanyRules, validate, companyController.updateMyCompany);
router.get("/:id", companyController.getCompanyById);

export default router;
