import { Router } from "express";
import adminRoutes from "./adminRoutes.js";
import applicationRoutes from "./applicationRoutes.js";
import authRoutes from "./authRoutes.js";
import companyRoutes from "./companyRoutes.js";
import contactRoutes from "./contactRoutes.js";
import cvRoutes from "./cvRoutes.js";
import jobRoutes from "./jobRoutes.js";
import notificationRoutes from "./notificationRoutes.js";
import taxonomyRoutes from "./taxonomyRoutes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/jobs", jobRoutes);
router.use("/companies", companyRoutes);
router.use("/applications", applicationRoutes);
router.use("/cv", cvRoutes);
router.use("/admin", adminRoutes);
router.use("/notifications", notificationRoutes);
router.use("/contact", contactRoutes);
router.use("/", taxonomyRoutes);

export default router;
