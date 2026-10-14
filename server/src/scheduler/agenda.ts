import { Agenda } from "agenda";
import { MongoBackend } from "@agendajs/mongo-backend";
import { dbConfig } from "@config";

const mongodbAddress = `${dbConfig.mongo.protocol}://${dbConfig.mongo.username}:${dbConfig.mongo.password}@${dbConfig.mongo.host}/?appName=${dbConfig.mongo.database.scheduler}`;

const agenda = new Agenda({
  backend: new MongoBackend({
    address: mongodbAddress,
  }),
});

export { agenda };
