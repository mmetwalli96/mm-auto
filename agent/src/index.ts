import { Agenda, Job } from "agenda";
import { MongoBackend } from "@agendajs/mongo-backend";
import { HumanMessage } from "@langchain/core/messages";
import { randomUUID } from "crypto";

import { detector } from "@graphs";
import { dbConfig, llmConfig } from "@config";
import { saveGraphAsPng } from "@utils";

type DetectData = { question: string; answer?: string };

const userQuestion =
  "Detect supply shortfall to create detection record if it exists.";
const mongodbAddress = `mongodb://${dbConfig.mongo.username}:${dbConfig.mongo.password}@${dbConfig.mongo.host}:${dbConfig.mongo.port}/${dbConfig.mongo.database.scheduler}?authSource=admin`;

saveGraphAsPng(detector, "../resources/imgs/graphs/detector.png");

const agenda = new Agenda({
  backend: new MongoBackend({
    address: mongodbAddress,
  }),
});

agenda.define("detect", async (job: Job<DetectData>) => {
  const { question } = job.attrs.data;
  const detectionThreadId = `detect-${new Date().toISOString()}-${randomUUID().slice(0, 12)}`;
  const recursionLimit = llmConfig.recursionLimit;
  const detectionConfig = {
    configurable: { thread_id: detectionThreadId },
    recursionLimit: recursionLimit,
  };

  const result = await detector.invoke(
    {
      messages: [new HumanMessage(question)],
    },
    detectionConfig,
  );

  const content = result.messages.at(-1)?.content;
  job.attrs.data.answer =
    typeof content === "string" ? content : JSON.stringify(content);
  await job.save();
});

agenda.on("fail:detect", (error, job) => {
  console.error(`Job ${job.attrs._id} failed:`, error);
});

await agenda.start();

try {
  await agenda.every("2 minutes", "detect", { question: userQuestion });
} catch (error) {
  console.error("Failed to schedule job:", error);
}
