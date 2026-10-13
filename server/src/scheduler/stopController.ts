import { agenda } from "@scheduler";
import { agendaConfig } from "@config";

type StopMode = "cancel" | "disable" | "stop";

let isRunning: boolean = false;
let pendingStop: StopMode | null = null;

async function applyStop(mode: StopMode) {
  const query = { name: agendaConfig.jobName };
  return mode === "cancel" ? agenda.cancel(query) : mode === "disable" ? agenda.disable(query) : agenda.stop();
}

function registerStopHandlers() {
  agenda.on(`start:${agendaConfig.jobName}`, () => {
    isRunning = true;
  });

  agenda.on(`complete:${agendaConfig.jobName}`, async () => {
    isRunning = false;
    if (pendingStop) {
      const mode = pendingStop;
      pendingStop = null;
      await applyStop(mode);
      console.log(`Deferred ${mode} applied after run finished`);
    }
  });
}

async function requestStop(mode: StopMode) {
  if (isRunning) {
    pendingStop = mode;
    return { status: "stopping" as const };
  }
  await applyStop(mode);
  return { status: "stopped" as const };
}

function clearPendingStop() {
  pendingStop = null;
}

export { registerStopHandlers, requestStop, clearPendingStop };

export type { StopMode };
