import { z } from "zod";

export const loginSchema = z.object({ email: z.email().max(254), password: z.string().min(6).max(128) });
export const contactSchema = z.object({ name: z.string().trim().min(2).max(100), email: z.email().max(254), phone: z.string().max(40).optional(), message: z.string().trim().min(10).max(3000) });
export const balanceSchema = z.object({ clientId: z.uuid(), type: z.enum(["deposit", "withdrawal", "trade_outcome", "adjustment"]), amount: z.coerce.number().finite().positive().max(100000000), direction: z.enum(["credit", "debit"]), note: z.string().trim().min(3).max(500), reference: z.string().max(100).optional(), idempotencyKey: z.uuid() });
export const withdrawalSchema = z.object({ amount: z.coerce.number().finite().positive().max(100000000), note: z.string().trim().max(500).optional() });
export const feedbackSchema = z.object({ category: z.enum(["question", "concern", "feedback"]), subject: z.string().trim().min(3).max(150), message: z.string().trim().min(10).max(3000), attachmentUrl: z.string().url().optional().or(z.literal("")) });
export const tradeSchema = z.object({ instrument: z.string().trim().min(2).max(100), direction: z.enum(["buy", "sell"]), size: z.coerce.number().positive(), entry: z.coerce.number().positive(), exit: z.coerce.number().nonnegative().optional(), pnl: z.coerce.number().finite(), status: z.enum(["open", "closed"]), notes: z.string().max(1000).optional() });
export const profileSchema = z.object({ fullName: z.string().trim().min(2).max(120), phone: z.string().trim().max(40), theme: z.enum(["light", "dark", "system"]).optional() });
export const createUserSchema = z.object({ fullName: z.string().trim().min(2).max(120), email: z.email(), role: z.enum(["trader", "client"]), password: z.string().min(8).max(128), traderId: z.uuid().optional().or(z.literal("")) });
export const cmsKeys = ["site", "hero", "features", "showcase", "steps", "preview", "about", "contact", "risk", "legal_terms", "legal_privacy", "legal_risk"] as const;
export const cmsKeySchema = z.enum(cmsKeys);
