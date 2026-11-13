import type { Request, Response } from "express";
import { createSnapshot } from '@models';
import { addClient, send } from "@/services";

const HEARTBEAT_MS = 25000;

export function health(_: Request, res: Response) {
  res.status(200).json({ status: "ok" });
}

export async function tableChangesStream(req: Request, res: Response) {
  let snapshot;
  try {
    snapshot = await createSnapshot();
  } catch (error) {
    res.status(500).end();
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  send(res, 'snapshot', snapshot);

  const removeClient = addClient(res);
  const heartbeat = setInterval(() => res.write(': ping\n\n'), HEARTBEAT_MS);
  req.on('close', () => {
    clearInterval(heartbeat);
    removeClient();
  });

}
