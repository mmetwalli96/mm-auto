import fs from "fs";
import { dbConfig } from "@config";
import { MongoClient } from "mongodb";
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";

import type { Clients } from '@/types/sse';
import type { CompiledStateGraph } from "@langchain/langgraph";
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';


export const saveGraphAsPng = async <S, U, I extends string>(
  graph: CompiledStateGraph<S, U, I, any, any, any, any, any, any, any>,
  filePath: string,
): Promise<void> => {
  try {
    const representation = await graph.getGraphAsync();
    const image = await representation.drawMermaidPng();
    const arrayBuffer = await image.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
  } catch (error) {
    console.error("Failed to save graph as PNG:", error);
  }
};

export const asyncHandler = <
  P = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = ParsedQs,
  Locals extends Record<string, unknown> = Record<string, unknown>,
>(
  fn: (
    req: Request<P, ResBody, ReqBody, ReqQuery, Locals>,
    res: Response<ResBody, Locals>,
    next: NextFunction,
  ) => Promise<unknown>,
): RequestHandler<P, ResBody, ReqBody, ReqQuery, Locals> => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const enableQuitKey = (): void => {
  const { stdin } = process;
  if (!stdin.isTTY) return;

  stdin.setRawMode(true);
  stdin.setEncoding("utf8");
  stdin.on("data", (key: string) => {
    if (key === "q" || key === "Q" || key === "\u0003") {
      process.kill(0, "SIGINT");
    }
  });
};

export const createCheckpointer = (collection: string) => {
  const mongoAddress = `${dbConfig.mongo.protocol}://${dbConfig.mongo.userName}:${dbConfig.mongo.password}@${dbConfig.mongo.host}/?appName=mmauto-agents`;
  const checkpointCollectionName = `${collection}_checkpoints`;
  const collectionWritesCollectionName = `${collection}_checkpoint_writes`;

  const mongoClient = new MongoClient(mongoAddress);

  const checkpointer = new MongoDBSaver({
    client: mongoClient,
    dbName: dbConfig.mongo.database.agent,
    checkpointCollectionName: checkpointCollectionName,
    checkpointWritesCollectionName: collectionWritesCollectionName,
  });
  return checkpointer;
};

export function send(res: Response, event: string, data: unknown): void {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export function broadcast(event: string, data: unknown, clients: Clients): void {
    for (const res of clients) send(res, event, data);
}

export function addClient(res: Response, clients: Clients): () => void {
    clients.add(res);
    return () => clients.delete(res);
}
