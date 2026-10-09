import { Agenda, Job } from "agenda";
import { MongoBackend } from "@agendajs/mongo-backend";
import { HumanMessage } from "@langchain/core/messages";
import { randomUUID } from "crypto";

import { AutoAgentGraph } from "@graphs";
import { dbConfig, llmConfig, agendaConfig } from "@config";
import type { Detection, Supplier } from "@schemas";

type JobData = {
  question: string;
  detections?: Detection[];
  suppliers?: Supplier[];
  notifierResponse?: string;
};

const userQuestion =
  "Detect supply shortfall to create detection record if it exists.";
const mongodbAddress = `mongodb://${dbConfig.mongo.username}:${dbConfig.mongo.password}@${dbConfig.mongo.host}:${dbConfig.mongo.port}/${dbConfig.mongo.database.scheduler}?authSource=admin`;

const agenda = new Agenda({
  backend: new MongoBackend({
    address: mongodbAddress,
  }),
});

agenda.define(agendaConfig.jobName, async (job: Job<JobData>) => {
  const { question } = job.attrs.data;
  const recursionLimit = llmConfig.recursionLimit;
  const autoThreadId = `auto-${new Date().toISOString()}-${randomUUID().slice(0, 12)}`;
  const autoConfig = {
    configurable: { thread_id: autoThreadId },
    recursionLimit: recursionLimit,
  };

  const autoAgentResponse = await AutoAgentGraph.invoke(
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

await agenda.start();

try {
  await agenda.every(agendaConfig.every, agendaConfig.jobName, {
    question: userQuestion,
  });
} catch (error) {
  console.error("Failed to schedule job:", error);
}
