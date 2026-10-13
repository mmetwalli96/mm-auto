import { agenda } from "@/scheduler/agenda";
import { createSupplyShortfallDetectionJob, DETECTION_QUESTION } from "@/scheduler/jobs/supplyShortfallDetections";
import { registerStopHandlers, requestStop, clearPendingStop } from "@/scheduler/stopController";
import type { StopMode } from "@/scheduler/stopController";

async function initializeScheduler() {
  createSupplyShortfallDetectionJob(agenda);
  registerStopHandlers();
  await agenda.start();
  console.log(`Scheduler initialized successfully`);
}

async function shutdownScheduler() {
  await requestStop("stop");
  console.log(`Scheduler shut down successfully`);
}

export { initializeScheduler, shutdownScheduler, agenda, DETECTION_QUESTION, registerStopHandlers, requestStop, clearPendingStop };
export type { StopMode };