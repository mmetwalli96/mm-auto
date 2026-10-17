import express from "express";
import cors from "cors";
import type { Request, Response, NextFunction } from "express";

import router from "@/routes";
import { serverConfig } from "@config";
import { initializeScheduler, shutdownScheduler } from "@scheduler";
import { postgresDataSource, neo4jGraph } from "@clients";
import { enableQuitKey } from "@utils";

const app = express();
app.use(
  cors({
    allowedHeaders: ["sessionId", "Content-Type", "Authorization"],
    exposedHeaders: ["sessionId"],
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    preflightContinue: false,
  }),
);
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  },
}));
app.use((_: Request, res: Response, next: NextFunction) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE",
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With,content-type",
  );
  res.setHeader("Access-Control-Allow-Credentials", "false");
  next();
});
app.use("/mm-auto", router);

const port = serverConfig.port;
const host = serverConfig.host;

await initializeScheduler();

const server = app.listen(port, host, () => {
  console.log(`Server running at http://${host}:${port}/mm-auto/health/`);
  console.log("Press 'q' to quit.");
});

enableQuitKey();

let isShuttingDown = false;

async function shutdown(signal: NodeJS.Signals) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  if (process.stdout.isTTY) process.stdout.write("\r\x1b[2K");
  console.log(`${signal} received, shutting down...`);

  const forceExit = setTimeout(() => {
    console.error("Shutdown timed out, forcing exit");
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  try {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await shutdownScheduler();
    await Promise.allSettled([
      postgresDataSource.isInitialized
        ? postgresDataSource.destroy()
        : Promise.resolve(),
      neo4jGraph.close(),
    ]);
    console.log("Shutdown complete");
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
