import { githubConfig, llmConfig } from "@config";
import type { Request, Response } from "express";
import { asyncHandler } from "@utils";
import { startScheduler, stopScheduler } from "@services";
import { randomUUID } from "crypto";
import { execFile } from 'child_process';
import { promisify } from 'util';
import { HumanMessage } from "@langchain/core/messages";
import { autoAgentGraph } from "@graphs";
import { resetPg, resetNeo4j } from "@/models/post";


const execFileAsync = promisify(execFile);
const SERVER_DIR = process.cwd();

export const startDetectionJob = asyncHandler(
  async (_: Request, res: Response) => {
    const { interval } = res.locals.body;
    const result = await startScheduler(interval);
    return res.status(201).json({ status: "scheduled", ...result });
  },
);

export const stopDetectionJob = asyncHandler(
  async (_: Request, res: Response) => {
    const { mode } = res.locals.body;
    console.log('Stopping detection job with mode:', mode);
    const result = await stopScheduler(mode);

    if ("statusMessage" in result) {
      return res.status(500).json(result);
    }
    return res.status(200).json({ ...result });
  },
);

export const updateRepository = asyncHandler(
  async (req: Request, res: Response) => {

    const event = req.get('X-GitHub-Event')!;
    if (event === 'ping') {
      return res.status(200).send('pong');
    }
    if (event !== 'push') {
      return res.status(400).json({ error: "Unsupported event type" });
    }
    const { deleted, ref } = req.body!;

    if (deleted) return res.status(204).end();
    if (ref !== 'refs/heads/master') return res.status(204).end();

    res.status(202).send('Accepted');

    try {
      const { stdout } = await execFileAsync('git', ['pull', '--ff-only'], {
        cwd: githubConfig.repositoryPath,
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
        timeout: githubConfig.timeout,
      });
      console.log('git pull:', stdout);

      await execFileAsync('npm', ['ci', '--include=dev'], { cwd: SERVER_DIR });
      await execFileAsync('npm', ['run', 'build'], { cwd: SERVER_DIR });
      await execFileAsync('pm2', ['reload', 'app']);
    } catch (error) {
      console.error('Error during repository update:', error);
    }

    return null;
  },
);

export const followUp = asyncHandler(
  async (req: Request, res: Response) => {
    try {

      const body = req.body!
      const messageId = body.events?.at(0).message_id;
      const from = body.events?.at(0).from;
      const timestamp = body.events?.at(0).timestamp;
      const textBody = body.events?.at(0).text_body;
      const responseMetadata = {
        message_id: messageId,
        sender: from,
        received_at: new Date(timestamp).toISOString(),
        text_body: textBody,
      }

      res.status(202).send('Accepted');

      const recursionLimit = llmConfig.recursionLimit;
      const autoThreadId = `mmauto-${new Date().toISOString()}-${randomUUID().slice(0, 12)}`;
      const autoConfig = {
        configurable: { thread_id: autoThreadId },
        recursionLimit: recursionLimit,
      };

      const humanMessage = new HumanMessage(`
      Follow-up received with the following metadata of the director response:
      ${JSON.stringify(responseMetadata, null, 2)}
      `);
      
      await autoAgentGraph.invoke(
        {
          messages: [humanMessage],
          toResolve: true
        },
        autoConfig
      );


      return null;

    } catch (error) {
      console.error('Error handling follow-up:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: (error as Error).message });
    }


  },
);

export const reset = asyncHandler(
  async (_: Request, res: Response) => {

    const pgState = await resetPg();
    if (!pgState.success) {
      return res.status(500).json({ status: "Failed to reset PostgreSQL", error: pgState.error! });
    }

    const neo4jState = await resetNeo4j();
    if (!neo4jState.success) {
      return res.status(500).json({ status: "Failed to reset Neo4j", error: neo4jState.error! });
    }

    return res.status(200).json({ status: "PostgreSQL and Neo4j reset successfully" });

  },
);
