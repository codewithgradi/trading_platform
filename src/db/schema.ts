import { sql } from "drizzle-orm";
import { boolean, check, index, integer, jsonb, numeric, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

const money = (name: string) => numeric(name, { precision: 18, scale: 2 });
const created = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  role: varchar("role", { length: 12 }).notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  theme: varchar("theme", { length: 12 }).notNull().default("system"),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  status: varchar("status", { length: 16 }).notNull().default("active"),
  notificationPreferences: jsonb("notification_preferences").$type<{ email: boolean; inApp: boolean }>().default({ email: true, inApp: true }),
  createdAt: created(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("profiles_role_idx").on(t.role), check("profiles_role_check", sql`${t.role} in ('admin', 'trader', 'client')`)]);

export const traderClients = pgTable("trader_clients", {
  clientId: uuid("client_id").primaryKey().references(() => profiles.id, { onDelete: "cascade" }),
  traderId: uuid("trader_id").notNull().references(() => profiles.id),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("trader_clients_trader_idx").on(t.traderId)]);

export const accounts = pgTable("accounts", {
  clientId: uuid("client_id").primaryKey().references(() => profiles.id, { onDelete: "cascade" }),
  balance: money("balance").notNull().default("0.00"),
  currency: varchar("currency", { length: 3 }).notNull().default("ZAR"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [check("accounts_zar_only", sql`${t.currency} = 'ZAR'`)]);

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => profiles.id),
  traderId: uuid("trader_id").references(() => profiles.id),
  type: varchar("type", { length: 24 }).notNull(),
  amount: money("amount").notNull(),
  balanceBefore: money("balance_before").notNull(),
  balanceAfter: money("balance_after").notNull(),
  note: text("note"),
  reference: text("reference"),
  status: varchar("status", { length: 16 }).notNull().default("completed"),
  idempotencyKey: uuid("idempotency_key").unique(),
  createdAt: created(),
}, (t) => [index("transactions_client_date_idx").on(t.clientId, t.createdAt), index("transactions_trader_idx").on(t.traderId)]);

export const withdrawalRequests = pgTable("withdrawal_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => profiles.id),
  amount: money("amount").notNull(),
  status: varchar("status", { length: 16 }).notNull().default("pending"),
  note: text("note"),
  reviewedBy: uuid("reviewed_by").references(() => profiles.id),
  reason: text("reason"),
  createdAt: created(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  processedAt: timestamp("processed_at", { withTimezone: true }),
}, (t) => [index("withdrawals_client_idx").on(t.clientId), index("withdrawals_status_idx").on(t.status)]);

export const trades = pgTable("trades", {
  id: uuid("id").primaryKey().defaultRandom(),
  traderId: uuid("trader_id").notNull().references(() => profiles.id),
  instrument: text("instrument").notNull(),
  direction: varchar("direction", { length: 8 }).notNull(),
  size: numeric("size", { precision: 18, scale: 4 }).notNull(),
  entry: numeric("entry", { precision: 18, scale: 4 }).notNull(),
  exit: numeric("exit", { precision: 18, scale: 4 }),
  pnl: money("pnl").notNull().default("0.00"),
  status: varchar("status", { length: 12 }).notNull().default("open"),
  notes: text("notes"),
  openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
}, (t) => [index("trades_trader_date_idx").on(t.traderId, t.openedAt)]);

export const tradeAllocations = pgTable("trade_allocations", {
  id: uuid("id").primaryKey().defaultRandom(),
  tradeId: uuid("trade_id").notNull().references(() => trades.id),
  clientId: uuid("client_id").notNull().references(() => profiles.id),
  amount: money("amount").notNull(),
  createdAt: created(),
}, (t) => [uniqueIndex("trade_allocations_unique_idx").on(t.tradeId, t.clientId)]);

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 32 }).notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  data: jsonb("data").$type<Record<string, unknown>>().default({}),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: created(),
}, (t) => [index("notifications_user_date_idx").on(t.userId, t.createdAt)]);

export const feedback = pgTable("feedback", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => profiles.id),
  assignedTo: uuid("assigned_to").references(() => profiles.id),
  category: varchar("category", { length: 24 }).notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  attachmentUrl: text("attachment_url"),
  status: varchar("status", { length: 16 }).notNull().default("open"),
  priority: varchar("priority", { length: 12 }).notNull().default("normal"),
  createdAt: created(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("feedback_client_idx").on(t.clientId), index("feedback_assignee_idx").on(t.assignedTo)]);

export const feedbackMessages = pgTable("feedback_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  feedbackId: uuid("feedback_id").notNull().references(() => feedback.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").notNull().references(() => profiles.id),
  body: text("body").notNull(),
  createdAt: created(),
}, (t) => [index("feedback_messages_thread_idx").on(t.feedbackId)]);

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: uuid("actor_id").references(() => profiles.id),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  before: jsonb("before_value").$type<Record<string, unknown>>(),
  after: jsonb("after_value").$type<Record<string, unknown>>(),
  createdAt: created(),
}, (t) => [index("audit_date_idx").on(t.createdAt), index("audit_actor_idx").on(t.actorId)]);

export const contactSubmissions = pgTable("contact_submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  message: text("message").notNull(),
  status: varchar("status", { length: 16 }).notNull().default("new"),
  createdAt: created(),
}, (t) => [index("contacts_date_idx").on(t.createdAt)]);

// Structured documents keep draft and published versions together, so a public read can never expose a draft.
export const cmsDocuments = pgTable("cms_documents", {
  key: varchar("key", { length: 80 }).primaryKey(),
  published: jsonb("published").$type<Record<string, unknown>>().notNull(),
  draft: jsonb("draft").$type<Record<string, unknown>>().notNull(),
  version: integer("version").notNull().default(1),
  updatedBy: uuid("updated_by").references(() => profiles.id),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cmsVersions = pgTable("cms_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: varchar("key", { length: 80 }).notNull().references(() => cmsDocuments.key),
  version: integer("version").notNull(),
  published: jsonb("published").$type<Record<string, unknown>>().notNull(),
  updatedBy: uuid("updated_by").references(() => profiles.id),
  createdAt: created(),
}, (t) => [index("cms_versions_key_idx").on(t.key, t.version)]);

export const faqs = pgTable("faqs", {
  id: uuid("id").primaryKey().defaultRandom(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  status: varchar("status", { length: 12 }).notNull().default("published"),
  sortOrder: integer("sort_order").notNull().default(0),
  updatedBy: uuid("updated_by").references(() => profiles.id),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const testimonials = pgTable("testimonials", {
  id: uuid("id").primaryKey().defaultRandom(),
  quote: text("quote").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  avatarUrl: text("avatar_url"),
  rating: integer("rating").notNull().default(5),
  status: varchar("status", { length: 12 }).notNull().default("published"),
  sortOrder: integer("sort_order").notNull().default(0),
  updatedBy: uuid("updated_by").references(() => profiles.id),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [check("testimonials_rating_check", sql`${t.rating} between 1 and 5`)]);

export const teamMembers = pgTable("team_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  sortOrder: integer("sort_order").notNull().default(0),
  status: varchar("status", { length: 12 }).notNull().default("published"),
  updatedBy: uuid("updated_by").references(() => profiles.id),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const customerNotes = pgTable("customer_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => profiles.id),
  traderId: uuid("trader_id").notNull().references(() => profiles.id),
  body: text("body").notNull(),
  createdAt: created(),
}, (t) => [index("customer_notes_client_idx").on(t.clientId), index("customer_notes_trader_idx").on(t.traderId)]);
