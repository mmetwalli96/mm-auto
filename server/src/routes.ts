import { Router } from "express";

import { startDetectionJob, stopDetectionJob, health, updateRepository, followUp, reset } from "@controllers";



const router = Router();

// get
router.get("/health", health);

// post
router.post("/start", startDetectionJob);
router.post("/stop", stopDetectionJob);
router.post("/update", updateRepository);
router.post("/follow", followUp);
router.post("/reset", reset); 

export default router;