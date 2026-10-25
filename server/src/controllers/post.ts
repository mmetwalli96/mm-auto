import crypto from "crypto";
import { githubConfig, llmConfig, mailtrapConfig } from "@config";
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
  async (req: Request, res: Response) => {
    const { interval, question } = req.body ?? {};
    if (interval !== undefined && typeof interval !== "string") {
      return res.status(400).json({
        error:
          "interval must be a string, e.g. '5 minutes' or a cron expression",
      });
    }
    const result = await startScheduler(interval, question);
    return res.status(201).json({ status: "scheduled", ...result });
  },
);

export const stopDetectionJob = asyncHandler(
  async (req: Request, res: Response) => {
    const { mode } = req.body ?? {};
    if (mode !== undefined && (mode !== "disable" && mode !== "cancel")) {
      return res.status(400).json({
        error: "mode must be of type { 'disable', 'cancel' }",
      });
    }
    const result = await stopScheduler(mode);
    if ("statusMessage" in result) {
      return res.status(500).json(result);
    }
    return res.status(200).json({ ...result });
  },
);

export const updateRepository = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.rawBody) return res.status(400).send('Missing raw body');

    const signature = req.get('X-Hub-Signature-256')!;
    const computedSignature = 'sha256=' + crypto.createHmac('sha256', githubConfig.secret).update(req.rawBody!).digest('hex');
    const a = Buffer.from(signature);
    const b = Buffer.from(computedSignature);

    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return res.sendStatus(401).json({ error: "Unauthorized Access" });
    }

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
      const signature = req.headers['mailtrap-signature'];
      const rawBody = req.rawBody!;
      const computedSignature = crypto.createHmac('sha256', mailtrapConfig.webhookSecret).update(rawBody).digest('hex');

      const a = Buffer.from(signature);
      const b = Buffer.from(computedSignature);
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return res.sendStatus(401).json({ error: "Unauthorized Access" });
      }

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

      const recursionLimit = llmConfig.recursionLimit;
      const autoThreadId = `auto-${new Date().toISOString()}-${randomUUID().slice(0, 12)}`;
      const autoConfig = {
        configurable: { thread_id: autoThreadId },
        recursionLimit: recursionLimit,
      };

      const humanMessage = new HumanMessage(`
      Follow-up received with the following metadata of the director response:
      ${JSON.stringify(responseMetadata, null, 2)}
    `);
      const response = await autoAgentGraph.invoke(
        {
          messages: [humanMessage],
          toResolve: true
        },
        autoConfig
      );


      return res.status(200).json({ status: "follow-up received", messages: response.messages });

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
