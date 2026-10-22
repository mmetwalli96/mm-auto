import type { Request, Response } from "express";

function health(_: Request, response: Response) {
  response.status(200).json({ status: "ok" });
}
export { health };
