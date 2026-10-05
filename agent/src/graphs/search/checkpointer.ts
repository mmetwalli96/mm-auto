import { MongoClient } from "mongodb";
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";

import { dbConfig } from "@config";

const mongoAddress = `mongodb://${dbConfig.mongo.username}:${dbConfig.mongo.password}@${dbConfig.mongo.host}:${dbConfig.mongo.port}/${dbConfig.mongo.database.agent}?authSource=admin`;
const checkpointCollectionName = "search_checkpoints";
const collectionWritesCollectionName = "search_checkpoint_writes";

const mongoClient = new MongoClient(mongoAddress);

const checkpointer = new MongoDBSaver({
    client: mongoClient,
    dbName: dbConfig.mongo.database.agent,
    checkpointCollectionName: checkpointCollectionName,
    checkpointWritesCollectionName: collectionWritesCollectionName,
});

export { checkpointer };