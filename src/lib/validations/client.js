import { z } from "zod";

export const clientSchema = z.object({
  name: z.string().trim().min(2,"Informe um nome com pelo menos 2 caracteres.").max(120),
  legal_name: z.string().trim().max(160).optional(),
  email: z.union([z.string().trim().email("Informe um e-mail válido."),z.literal("")]).optional(),
  phone: z.string().trim().max(30).optional(),
  whatsapp: z.string().trim().max(30).optional(),
  source: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(3000).optional(),
  status: z.enum(["active","inactive"]).default("active"),
});

export function clientPayload(formData){return clientSchema.parse(Object.fromEntries(formData.entries()))}
