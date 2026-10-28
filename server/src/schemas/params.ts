import { z } from "zod";

export const UpdateEmployeeParamsSchema = z.strictObject({
    id: z.string(),
}, {
    error: (issue) => {
        if (issue.code === "unrecognized_keys") {
            return { message: `Unrecognized keys: ${issue.keys.join(", ")}. Allowed key is only: 'id'` };
        }
        return undefined;
    }
});