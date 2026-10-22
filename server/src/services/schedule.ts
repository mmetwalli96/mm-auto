import { agenda, DETECTION_QUESTION, requestStop, clearPendingStop } from "@scheduler";
import { agendaConfig } from "@config";
import type { StopMode } from "@scheduler";

async function startScheduler(
  interval: string = agendaConfig.every,
  question: string = DETECTION_QUESTION,
) {
  try {
    clearPendingStop();
    const job = await agenda.every(interval, agendaConfig.jobName, {
      question: question,
    });

    return {
      name: agendaConfig.jobName,
      interval,
      nextRunAt: job.attrs.nextRunAt,
    };
  } catch (error) {
    console.error("Failed to schedule job:", error);
    return {
        status: `Failed to schedule ${agendaConfig.jobName}`,
        error: error,
    };
  }
}

async function stopScheduler(mode: StopMode = "disable") {
  try {
    return await requestStop(mode);
  } catch (error) {
    console.error("Failed to stop job:", error);
    return {
        status: `Failed to stop ${agendaConfig.jobName}`,
        error: error,
    };
  }
}

export { startScheduler, stopScheduler };