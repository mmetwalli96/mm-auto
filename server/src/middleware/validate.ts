import z from "zod";
import type { NextFunction, RequestHandler, Request, Response } from "express";
import type { ZodType } from "zod";

type Options = { params?: ZodType; query?: ZodType; body?: ZodType };

export const validate = (options: Options): RequestHandler => (req: Request, res: Response, next: NextFunction) => {
    const errors: Record<string, unknown> = {};

    for (const key of ["params", "query", "body"] as const) {
        const schema = options[key];
        if (!schema) continue;
        const parsed = schema.safeParse(req[key]);
        if (!parsed.success) {
            errors[key] = z.flattenError(parsed.error);
        } else {
            res.locals[key] = parsed.data;
        }
    }

    if (Object.keys(errors).length > 0) {
        return res.status(400).json({ errors });
    }
    return next();
};
