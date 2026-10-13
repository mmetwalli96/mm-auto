import fs from "fs";
import type { CompiledStateGraph } from "@langchain/langgraph";
import type { Request, Response, NextFunction, RequestHandler } from "express";

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
  P = Record<string, string>,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = Record<string, string>,
>(
  fn: (
    req: Request<P, ResBody, ReqBody, ReqQuery>,
    res: Response<ResBody>,
    next: NextFunction,
  ) => Promise<unknown>,
): RequestHandler<P, ResBody, ReqBody, ReqQuery> => {
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
