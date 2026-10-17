import crypto from "crypto";
import { githubConfig } from "@config";
import type { Request, Response } from "express";
import { asyncHandler } from "@utils";
import { startScheduler, stopScheduler } from "@services";

import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);


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

    const sig = req.get('X-Hub-Signature-256')!;
    const serverSignature = 'sha256=' + crypto.createHmac('sha256', githubConfig.secret).update(req.rawBody!).digest('hex');
    const a = Buffer.from(sig)
    const b = Buffer.from(serverSignature);

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
    } catch (error) {
      console.error('git pull error:', error);
    }

    return res.status(200).json({ status: "repository updated" });
  },
);
