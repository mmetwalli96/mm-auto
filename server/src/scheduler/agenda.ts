import { Agenda } from "agenda";
import { MongoBackend } from "@agendajs/mongo-backend";
import { dbConfig } from "@config";

const mongodbAddress = `mongodb://${dbConfig.mongo.username}:${dbConfig.mongo.password}@${dbConfig.mongo.host}:${dbConfig.mongo.port}/${dbConfig.mongo.database.scheduler}?authSource=admin`;

const agenda = new Agenda({
  backend: new MongoBackend({
    address: mongodbAddress,
  }),
});

export { agenda };
