import { Router } from "express";

import { startDetectionJob, stopDetectionJob, health, updateRepository } from "@controllers";



const router = Router();

// get
router.get("/health", health);

// post
router.post("/start", startDetectionJob);
router.post("/stop", stopDetectionJob);
router.post("/update", updateRepository);

export default router;