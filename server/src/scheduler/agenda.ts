import { Agenda } from "agenda";
import { MongoBackend } from "@agendajs/mongo-backend";
import { dbConfig } from "@config";

const mongodbAddress = `${dbConfig.mongo.protocol}://${dbConfig.mongo.userName}:${dbConfig.mongo.password}@${dbConfig.mongo.host}/${dbConfig.mongo.database.scheduler}?appName=mmauto-agenda`;

const agenda = new Agenda({
  backend: new MongoBackend({
    address: mongodbAddress,
  }),
});

export { agenda };
