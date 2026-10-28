import z from "zod";
const INTERVAL_REGEX = /^([1-9]\d*) minutes?$/;
const NAME_REGEX = /^[A-Z][a-zA-Z]*(?:['-][a-zA-Z]+)*(?: [A-Z][a-zA-Z]*(?:['-][a-zA-Z]+)*)+$/;

const StartJobBodySchema = z.strictObject({
    interval: z
        .string()
        .regex(INTERVAL_REGEX, { message: 'interval must look like "15 minutes"', abort: true })
        .refine((v) => {
            const n = Number(v.match(INTERVAL_REGEX)![1]);
            return n >= 1 && n <= 1440;
        }, { message: "interval must be between 1 and 1440 minutes", abort: true })
        .optional().describe("Interval for the job in minutes")
},
    {
        error: (issue) => {
            if (issue.code === "unrecognized_keys") {
                return { message: `Unrecognized keys: ${issue.keys.join(", ")}. Allowed key is only: 'interval'` };
            }
            return undefined;
        }
    }
);

const StopJobBodySchema = z.strictObject({
    mode: z.enum(["disable", "cancel"]).optional().describe("Mode to stop the job it is either 'disable' or 'cancel'"),
},
    {
        error: (issue) => {
            if (issue.code === "unrecognized_keys") {
                return { message: `Unrecognized keys: ${issue.keys.join(", ")}. Allowed key is only: 'mode'` };
            }
            return undefined;
        }
    }
);

const UpdateEmployeeRecordBody = z.strictObject({
    name: z.string().regex(NAME_REGEX, { message: "Name must look like 'John Doe'", abort: true }).describe("Employee's full name"),
    email: z.email({ message: "Invalid email address", abort: true }).describe("Employee's email address"),
},
    {
        error: (issue) => {
            if (issue.code === "unrecognized_keys") {
                return { message: `Unrecognized keys: ${issue.keys.join(", ")}. Allowed keys are: 'name', 'email'` };
            }
            return undefined;
        }
    }
);


export { StartJobBodySchema, StopJobBodySchema, UpdateEmployeeRecordBody };