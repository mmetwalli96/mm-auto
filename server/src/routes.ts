import { Router } from "express";
import * as auth from "@/middleware/auth";
import { validate } from "@/middleware/validate";
import * as controllers from "@controllers";
import { serverConfig, githubConfig, mailtrapConfig } from "@config";
import { UpdateEmployeeParamsSchema, UpdateEmployeeRecordBody, StartJobBodySchema, StopJobBodySchema } from "@schemas";

const router = Router();
const bearer = auth.requireBearer(serverConfig.secret);

// get
router.get("/health", controllers.health);

// post
router.post("/jobs/start", bearer, validate({ body: StartJobBodySchema }), controllers.startDetectionJob);
router.post("/jobs/stop", bearer, validate({ body: StopJobBodySchema }), controllers.stopDetectionJob);
router.post("/webhook/github/pull", auth.requireHmac({ header: "X-Hub-Signature-256", secret: githubConfig.secret, prefix: "sha256=" }), controllers.updateRepository);
router.post("/webhook/mailtrap/follow", auth.requireHmac({ header: "X-Mailtrap-Signature", secret: mailtrapConfig.webhookSecret }), controllers.followUp);
router.post("/db/reset", bearer, controllers.reset);

// patch
router.patch("/db/update/employee/:id", bearer, validate({ params: UpdateEmployeeParamsSchema, body: UpdateEmployeeRecordBody }), controllers.updateEmployeeData);

export default router;