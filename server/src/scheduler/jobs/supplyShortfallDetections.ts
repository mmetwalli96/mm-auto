import type { Agenda, Job } from "agenda";
import { HumanMessage } from "@langchain/core/messages";
import { randomUUID } from "crypto";

import type { Detection, Supplier } from "@schemas";
import { autoAgentGraph } from "@graphs";
import { llmConfig, agendaConfig } from "@config";

type JobData = {
  question: string;
  detections?: Detection[];
  suppliers?: Supplier[];
  notifierResponse?: string;
};

const DETECTION_QUESTION =
  "Detect supply shortfall to create detection record if it exists.";

function createSupplyShortfallDetectionJob(agenda: Agenda) {
  agenda.define(agendaConfig.jobName, async (job: Job<JobData>) => {
    const { question } = job.attrs.data;
    const recursionLimit = llmConfig.recursionLimit;
    const autoThreadId = `auto-${new Date().toISOString()}-${randomUUID().slice(0, 12)}`;
    const autoConfig = {
      configurable: { thread_id: autoThreadId },
      recursionLimit: recursionLimit,
    };

    const autoAgentResponse = await autoAgentGraph.invoke(
      {
        messages: [new HumanMessage(question)],
        toResolve: false,
      },
      autoConfig,
    );

    job.attrs.data.detections = autoAgentResponse.detections;
    job.attrs.data.suppliers = autoAgentResponse.suppliers;
    job.attrs.data.notifierResponse = autoAgentResponse.messages.at(-1)?.text;
    console.log(`Job completed successfully.`);
    await job.save();
  });

  agenda.on(`fail:${agendaConfig.jobName}`, (error, job) => {
    console.error(`Job ${job.attrs._id} failed:`, error);
  });
}

export { createSupplyShortfallDetectionJob, DETECTION_QUESTION };
