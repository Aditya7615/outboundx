import { z } from "zod";

const email = z.string().trim().email().max(255);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value === "" ? undefined : value));

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email,
  password: z.string().min(8).max(72)
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(72)
});

export const contactCreateSchema = z.object({
  email,
  phone: optionalText(32),
  firstName: optionalText(100),
  lastName: optionalText(100),
  company: optionalText(150),
  status: z.enum(["active", "unsubscribed"]).default("active")
});

export const contactUpdateSchema = contactCreateSchema.partial();

export const contactListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().max(200).optional(),
  search: z.string().trim().max(120).optional(),
  status: z.enum(["active", "unsubscribed"]).optional()
});

export const campaignCreateSchema = z
  .object({
    title: z.string().trim().min(2).max(180),
    content: z.string().trim().min(10).max(20000),
    audienceType: z.enum(["all_active", "selected"]).default("all_active"),
    audienceContactIds: z.array(z.number().int().positive()).max(5000).optional(),
    scheduledFor: z.string().datetime({ offset: true }).optional()
  })
  .superRefine((value, ctx) => {
    if (value.audienceType === "selected" && !value.audienceContactIds?.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select at least one contact for a selected audience",
        path: ["audienceContactIds"]
      });
    }
  });

export const campaignUpdateSchema = z.object({
  title: z.string().trim().min(2).max(180).optional(),
  content: z.string().trim().min(10).max(20000).optional(),
  audienceType: z.enum(["all_active", "selected"]).optional(),
  audienceContactIds: z.array(z.number().int().positive()).max(5000).nullable().optional(),
  scheduledFor: z.string().datetime({ offset: true }).nullable().optional()
});

export const campaignListQuerySchema = z.object({
  status: z.enum(["draft", "scheduled", "sending", "completed"]).optional()
});

export const logListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().max(200).optional()
});

export const analyticsQuerySchema = z.object({
  days: z.coerce.number().int().min(7).max(90).default(30)
});

export const webhookEventSchema = z.object({
  messageId: z.string().min(1).max(120),
  type: z.enum(["opened", "clicked"]),
  timestamp: z.string().datetime({ offset: true }).optional()
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ContactCreateInput = z.infer<typeof contactCreateSchema>;
export type ContactUpdateInput = z.infer<typeof contactUpdateSchema>;
export type ContactListQuery = z.infer<typeof contactListQuerySchema>;
export type CampaignCreateInput = z.infer<typeof campaignCreateSchema>;
export type CampaignUpdateInput = z.infer<typeof campaignUpdateSchema>;
export type LogListQuery = z.infer<typeof logListQuerySchema>;
