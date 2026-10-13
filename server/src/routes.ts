import { Router } from "express";

import { startDetectionJob, stopDetectionJob, health } from "@controllers";



const router = Router();

// get
router.get("/health", health);

// post
router.post("/start", startDetectionJob);
router.post("/stop", stopDetectionJob);

export default router;