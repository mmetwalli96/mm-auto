import { agent } from "./agent";
import { Agenda, Job } from "agenda";
import { MongoBackend } from "@agendajs/mongo-backend";
import { dbConfig } from "./utils/config";
import { HumanMessage } from "@langchain/core/messages";

type DetectData = { question: string; answer?: string };

const question = "Is there a supply shortfall in the factory?";
const mongodbAddress = `mongodb://${dbConfig.mongo.username}:${dbConfig.mongo.password}@${dbConfig.mongo.host}:${dbConfig.mongo.port}/${dbConfig.mongo.database}?authSource=admin`;

const agenda = new Agenda({
  backend: new MongoBackend({
    address: mongodbAddress,
  }),
});

agenda.define("detect", async (job: Job<DetectData>) => {
  const { question } = job.attrs.data;
  const result = await agent.invoke({
    messages: [new HumanMessage(question)],
  });

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
  await agenda.every("2 minutes", "detect", { question });
} catch (error) {
  console.error("Failed to schedule job:", error);
}
