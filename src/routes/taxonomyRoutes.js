import { Router } from "express";
import * as taxonomyController from "../controllers/taxonomyController.js";

const router = Router();

router.get("/categories", taxonomyController.listCategories);
router.get("/districts", taxonomyController.listDistricts);

export default router;
