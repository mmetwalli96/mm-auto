import { z } from "zod"

const DetectionSchema = z.object({
  supplierId: z.string(),
  supplierName: z.string(),
  partId: z.string(),
  partName: z.string(),
  partDescription: z.string(),
  qty: z.number(),
  detectionDate: z.string(),
  incidentId: z.string(),
  lastEventDescription: z.string().nullable().default(null),
  lastEventDate: z.string().nullable().default(null),
});

type Detection = z.infer<typeof DetectionSchema>;

export { DetectionSchema };

export type { Detection };