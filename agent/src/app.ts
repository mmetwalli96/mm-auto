import { Agenda, Job } from "agenda";
import { MongoBackend } from "@agendajs/mongo-backend";
import { HumanMessage } from "@langchain/core/messages";
import { randomUUID } from "crypto";

import { detector, searcher } from "@graphs";
import { dbConfig, llmConfig } from "@config";
import { saveGraphAsPng } from "@utils";
import type { Detection, Supplier } from "@schemas";

type data = { question: string; detections?: Detection[], suppliers?: Supplier[] };

const userQuestion =
  "Detect supply shortfall to create detection record if it exists.";
const mongodbAddress = `mongodb://${dbConfig.mongo.username}:${dbConfig.mongo.password}@${dbConfig.mongo.host}:${dbConfig.mongo.port}/${dbConfig.mongo.database.scheduler}?authSource=admin`;

saveGraphAsPng(detector, "../resources/imgs/graphs/detector.png");
saveGraphAsPng(searcher, "../resources/imgs/graphs/searcher.png");

const agenda = new Agenda({
  backend: new MongoBackend({
    address: mongodbAddress,
  }),
});

agenda.define("detect", async (job: Job<data>) => {
  const { question } = job.attrs.data;
  const detectionThreadId = `detect-${new Date().toISOString()}-${randomUUID().slice(0, 12)}`;
  const searcherThreadId = `search-${new Date().toISOString()}-${randomUUID().slice(0, 12)}`;
  const recursionLimit = llmConfig.recursionLimit;
  const detectionConfig = {
    configurable: { thread_id: detectionThreadId },
    recursionLimit: recursionLimit,
  };
  const searcherConfig = {
    configurable: { thread_id: searcherThreadId },
    recursionLimit: recursionLimit,
  };

  const detectorResponse = await detector.invoke(
    {
      messages: [new HumanMessage(question)],
    },
    detectionConfig,
  );
  const detections = detectorResponse.detections;
  
  const searcherResponse = await searcher.invoke(
    {
      messages: [new HumanMessage(`Here is the list of detections: ${JSON.stringify(detections, null, 2)} To find alternative suppliers.`)],
    },
    searcherConfig,
  );
  const suppliers = searcherResponse.suppliers;

  job.attrs.data.detections = detections;
  job.attrs.data.suppliers = suppliers;
  await job.save();
});

agenda.on("fail:detect", (error, job) => {
  console.error(`Job ${job.attrs._id} failed:`, error);
});

await agenda.start();

try {
  await agenda.every("10 minutes", "detect", { question: userQuestion });
} catch (error) {
  console.error("Failed to schedule job:", error);
}
