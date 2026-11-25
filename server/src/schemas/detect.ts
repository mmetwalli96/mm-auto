import { z } from "zod"

const DetectionSchema = z.object({
  supplierId: z.string().describe("ID of the supplier"),
  supplierName: z.string().describe("Name of the supplier"),
  partId: z.string().describe("ID of the part"),
  partName: z.string().describe("Name of the part"),
  partDescription: z.string().describe("Description of the part"),
  qty: z.number().describe("Needed quantity"),
  resolutionDate: z.string().describe("Expected resolution date by the supplier"),
  detectionDate: z.string().describe("Date when the detection was made by the agent"),
  incidentId: z.string().describe("ID of the incident"),
  lastEventDescription: z.string().nullable().default(null).describe("Description of the last progress event related to the incident"),
  lastEventDate: z.string().nullable().default(null).describe("Date of the last progress event related to the incident"),
});

type Detection = z.infer<typeof DetectionSchema>;

export { DetectionSchema };

export type { Detection };