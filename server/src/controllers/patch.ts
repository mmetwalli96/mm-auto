import { updateEmployeeRecord } from "@/models/patch";
import { Request, Response } from "express";
import { asyncHandler } from "@utils";

export const updateEmployeeData = asyncHandler(async (_: Request, res: Response) => {
    try {
        const { id } = res.locals.params;
        const { name, email } = res.locals.body;

        const employee = {
            id,
            name,
            email
        };
        await updateEmployeeRecord(employee);

        return res.status(200).json({ success: true, message: "Employee record updated successfully" });
    } catch (error) {
        return res.status(500).json({ success: false, error: (error as Error).message });
    }
});