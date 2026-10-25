import { Router } from "express";

import * as controllers from "@controllers";



const router = Router();

// get
router.get("/health", controllers.health);

// post
router.post("/start", controllers.startDetectionJob);
router.post("/stop", controllers.stopDetectionJob);
router.post("/update", controllers.updateRepository);
router.post("/follow", controllers.followUp);
router.post("/reset", controllers.reset); 

// patch
router.patch("/employee", controllers.updateEmployeeData);

export default router;