import type { Request, Response } from "express";
import { asyncHandler } from "@utils";
import { startScheduler, stopScheduler } from "@services";

export const startDetectionJob = asyncHandler(
  async (req: Request, res: Response) => {
    const { interval, question } = req.body ?? {};
    if (interval !== undefined && typeof interval !== "string") {
      return res.status(400).json({
        error:
          "interval must be a string, e.g. '5 minutes' or a cron expression",
      });
    }
    const result = await startScheduler(interval, question);
    return res.status(201).json({ status: "scheduled", ...result });
  },
);

export const stopDetectionJob = asyncHandler(
  async (req: Request, res: Response) => {
    const { mode } = req.body ?? {};
    if (mode !== undefined && (mode !== "disable" && mode !== "cancel")) {
      return res.status(400).json({
        error: "mode must be of type { 'disable', 'cancel' }",
      });
    }
    const result = await stopScheduler(mode);
    if ("statusMessage" in result) {
      return res.status(500).json(result);
    }
    return res.status(200).json({ ...result });
  },
);
