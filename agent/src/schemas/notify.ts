import { z } from "zod"

const recipientSchema = z.object({
  partId: z.string(),
  partName: z.string(),
  supplierName: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.email(),
});

type Recipient = z.infer<typeof recipientSchema>;

export { recipientSchema };

export type { Recipient };