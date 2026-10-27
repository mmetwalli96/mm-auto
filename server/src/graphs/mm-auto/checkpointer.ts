import { MongoClient } from "mongodb";
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";

import { dbConfig } from "@config";

const mongoAddress = `${dbConfig.mongo.protocol}://${dbConfig.mongo.userName}:${dbConfig.mongo.password}@${dbConfig.mongo.host}/?appName=mmauto-agents`;
const checkpointCollectionName = "mmauto_checkpoints";
const collectionWritesCollectionName = "mmauto_checkpoint_writes";

const mongoClient = new MongoClient(mongoAddress);

const checkpointer = new MongoDBSaver({
    client: mongoClient,
    dbName: dbConfig.mongo.database.agent,
    checkpointCollectionName: checkpointCollectionName,
    checkpointWritesCollectionName: collectionWritesCollectionName,
});

export { checkpointer };