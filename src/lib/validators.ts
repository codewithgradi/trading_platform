import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const contactSchema = z.object({
  name: z.string().min(2, "Tell us your name"),
  email: z.string().email("Enter a valid email address"),
  company: z.string().max(120).optional().or(z.literal("")),
  message: z.string().min(20, "Please give us a little more detail (20+ characters)").max(2000),
});

export const balanceActionSchema = z.object({
  clientId: z.string().uuid(),
  type: z.enum(["deposit", "withdrawal", "trade_outcome", "adjustment"]),
  amount: z.coerce.number().refine((n) => Math.abs(n) > 0, "Amount must not be zero"),
  direction: z.enum(["credit", "debit"]).default("credit"),
  note: z.string().max(500).optional().or(z.literal("")),
  reference: z.string().max(120).optional().or(z.literal("")),
  idempotencyKey: z.string().min(8),
});

export const withdrawalRequestSchema = z.object({
  amount: z.coerce.number().positive("Enter an amount greater than zero"),
  method: z.enum(["bank_transfer", "wire", "stablecoin"]),
  destination: z.string().min(4, "Add the destination account reference").max(160),
});

export const withdrawalReviewSchema = z.object({
  requestId: z.string().uuid(),
  decision: z.enum(["approved", "rejected", "processed"]),
  reason: z.string().max(400).optional().or(z.literal("")),
});

export const tradeSchema = z.object({
  instrument: z.string().min(2, "Instrument is required").max(40),
  direction: z.enum(["long", "short"]),
  size: z.coerce.number().positive("Size must be positive"),
  entry: z.coerce.number().positive("Entry price must be positive"),
  exit: z.coerce.number().optional(),
  pnl: z.coerce.number().default(0),
  status: z.enum(["open", "closed"]),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export const feedbackSchema = z.object({
  category: z.enum(["question", "concern", "complaint", "praise"]),
  subject: z.string().min(4, "Add a short subject").max(140),
  message: z.string().min(10, "Describe the issue in a little more detail").max(2000),
});

export const feedbackReplySchema = z.object({
  feedbackId: z.string().uuid(),
  body: z.string().min(2, "Write a reply").max(2000),
});

export const profileSchema = z.object({
  fullName: z.string().min(2, "Name is required").max(120),
  phone: z.string().max(40).optional().or(z.literal("")),
  avatarUrl: z.string().url("Enter a valid image URL").optional().or(z.literal("")),
  bio: z.string().max(400).optional().or(z.literal("")),
  emailNotifications: z.coerce.boolean().default(true),
});

export const passwordSchema = z
  .object({
    currentPassword: z.string().min(6, "Enter your current password"),
    newPassword: z
      .string()
      .min(8, "Use at least 8 characters")
      .regex(/[A-Z]/, "Include an uppercase letter")
      .regex(/[0-9]/, "Include a number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const createUserSchema = z.object({
  fullName: z.string().min(2, "Name is required").max(120),
  email: z.string().email("Enter a valid email address"),
  role: z.enum(["admin", "trader", "client"]),
  phone: z.string().max(40).optional().or(z.literal("")),
  temporaryPassword: z.string().min(8, "Temporary password needs 8+ characters"),
  traderId: z.string().uuid().optional().or(z.literal("")),
  openingBalance: z.coerce.number().min(0).default(0),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type BalanceActionInput = z.infer<typeof balanceActionSchema>;
export type TradeInput = z.infer<typeof tradeSchema>;
