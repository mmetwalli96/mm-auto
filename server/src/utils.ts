import fs from "fs";
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
