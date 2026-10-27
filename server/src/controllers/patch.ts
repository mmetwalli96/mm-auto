import { updateEmployeeRecord } from "@/models/patch";
import { Request, Response } from "express";
import { asyncHandler } from "@utils";
import { serverConfig } from "@config";
import crypto from "crypto";


export const updateEmployeeData = asyncHandler(async (req: Request, res: Response) => {
    try {
        const token = req.headers.authorization?.split(" ")?.[1] ?? "";
        const serverSecret = serverConfig.secret;

        const tokenBuffer = Buffer.from(token);
        const secretBuffer = Buffer.from(String(serverSecret));
        if (
            tokenBuffer.length !== secretBuffer.length ||
            !crypto.timingSafeEqual(tokenBuffer, secretBuffer)
        ) {
            return res.status(401).json({ error: "Unauthorized Access Detected" });
        }

        const { name, email } = req.body;
        const employee = {
            id: process.env.EMPLOYEE_ID!,
            name,
            email
        };
        await updateEmployeeRecord(employee);
        return res.status(200).json({ success: true, message: "Employee record updated successfully" });
    } catch (error) {
        return res.status(500).json({ success: false, error: (error as Error).message });
    }
});