import crypto from "crypto";
import type { RequestHandler } from "express";
import type { Request, Response, NextFunction } from "express";

const sha256 = (v: string | Buffer) => crypto.createHash("sha256").update(v).digest();
const safeEqual = (a: string, b: string) => crypto.timingSafeEqual(sha256(a), sha256(b));

export const requireBearer = (secret: string): RequestHandler => (req: Request, res: Response, next: NextFunction) => {
    const [authType, token] = req.headers.authorization?.split(" ") ?? [];
    if (authType !== "Bearer" || !token || !safeEqual(token, secret)) {
        return res.status(401).json({ error: "Unauthorized Access Detected" });
    }
    return next();
};

export const requireHmac = (opts: {
    header: string;
    secret: string;
    prefix?: string;
}): RequestHandler => (req: Request, res: Response, next: NextFunction) => {
    const signature = req.get(opts.header);
    if (!signature || !req.rawBody) return res.status(401).json({ error: "Unauthorized Access Detected" });
    const expectedSignature =
        (opts.prefix ?? "") +
        crypto.createHmac("sha256", opts.secret).update(req.rawBody).digest("hex");
    if (!safeEqual(signature, expectedSignature)) return res.status(401).json({ error: "Unauthorized Access Detected" });
    return next();
};

