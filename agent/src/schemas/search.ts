import { z } from "zod"

const SuppliersSchema = z.object({
  partId: z.string(),
  partName: z.string(),
  supplierName: z.string(),
  contactPhone: z.string(),
  contactEmail: z.string(),
  address: z.string()
})

type Supplier = z.infer<typeof SuppliersSchema>;

export { SuppliersSchema, Supplier }