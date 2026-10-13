import type { Request, Response } from "express";

function health(_: Request, response: Response) {
  response.status(200).json({ statusMessage: "ok" });
}
export { health };
