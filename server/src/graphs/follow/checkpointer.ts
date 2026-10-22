import { MongoClient } from "mongodb";
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";

import { dbConfig } from "@config";

const mongoAddress = `${dbConfig.mongo.protocol}://${dbConfig.mongo.userName}:${dbConfig.mongo.password}@${dbConfig.mongo.host}/?appName=${dbConfig.mongo.database.agent}`;
const checkpointCollectionName = "follow_checkpoints";
const collectionWritesCollectionName = "follow_checkpoint_writes";

const mongoClient = new MongoClient(mongoAddress);

const checkpointer = new MongoDBSaver({
    client: mongoClient,
    dbName: dbConfig.mongo.database.agent,
    checkpointCollectionName: checkpointCollectionName,
    checkpointWritesCollectionName: collectionWritesCollectionName,
});

export { checkpointer };