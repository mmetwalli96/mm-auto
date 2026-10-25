import { updateEmployeeRecord } from "@/models/patch";
import { Request, Response } from "express";
import { asyncHandler } from "@utils";


export const updateEmployeeData = asyncHandler(async (req: Request, res: Response) => {
    try {
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