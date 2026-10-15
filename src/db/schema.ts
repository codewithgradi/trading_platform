import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* -------------------------------------------------------------------------- */
/*                               Identity / auth                              */
/* -------------------------------------------------------------------------- */

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull().default("client"), // admin | trader | client
    fullName: text("full_name").notNull(),
    phone: text("phone"),
    avatarUrl: text("avatar_url"),
    bio: text("bio"),
    theme: text("theme").notNull().default("system"), // light | dark | system
    onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
    emailNotifications: boolean("email_notifications").notNull().default(true),
    status: text("status").notNull().default("active"), // active | suspended
    mustChangePassword: boolean("must_change_password").notNull().default(false),
    twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("profiles_email_idx").on(t.email), index("profiles_role_idx").on(t.role)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    userAgent: text("user_agent"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId), uniqueIndex("sessions_token_idx").on(t.tokenHash)],
);

export const traderClients = pgTable(
  "trader_clients",
  {
    traderId: uuid("trader_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.traderId, t.clientId] }),
    index("trader_clients_client_idx").on(t.clientId),
  ],
);

/* -------------------------------------------------------------------------- */
/*                                   Money                                    */
/* -------------------------------------------------------------------------- */

export const accounts = pgTable("accounts", {
  clientId: uuid("client_id")
    .primaryKey()
    .references(() => profiles.id, { onDelete: "cascade" }),
  balance: numeric("balance", { precision: 16, scale: 2, mode: "number" }).notNull().default(0),
  currency: text("currency").notNull().default("USD"),
  totalDeposited: numeric("total_deposited", { precision: 16, scale: 2, mode: "number" })
    .notNull()
    .default(0),
  totalWithdrawn: numeric("total_withdrawn", { precision: 16, scale: 2, mode: "number" })
    .notNull()
    .default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    traderId: uuid("trader_id").references(() => profiles.id, { onDelete: "set null" }),
    type: text("type").notNull(), // deposit | withdrawal | trade_outcome | adjustment
    amount: numeric("amount", { precision: 16, scale: 2, mode: "number" }).notNull(),
    balanceBefore: numeric("balance_before", { precision: 16, scale: 2, mode: "number" }).notNull(),
    balanceAfter: numeric("balance_after", { precision: 16, scale: 2, mode: "number" }).notNull(),
    note: text("note"),
    status: text("status").notNull().default("completed"), // completed | pending | reversed
    reference: text("reference"),
    idempotencyKey: text("idempotency_key"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("transactions_client_idx").on(t.clientId, t.createdAt),
    index("transactions_trader_idx").on(t.traderId),
    uniqueIndex("transactions_idempotency_idx").on(t.idempotencyKey),
  ],
);

export const withdrawalRequests = pgTable(
  "withdrawal_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 16, scale: 2, mode: "number" }).notNull(),
    method: text("method").notNull().default("bank_transfer"),
    destination: text("destination"),
    status: text("status").notNull().default("pending"), // pending | approved | rejected | processed
    reviewedBy: uuid("reviewed_by").references(() => profiles.id, { onDelete: "set null" }),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (t) => [index("withdrawals_client_idx").on(t.clientId), index("withdrawals_status_idx").on(t.status)],
);

export const trades = pgTable(
  "trades",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    traderId: uuid("trader_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    instrument: text("instrument").notNull(),
    direction: text("direction").notNull(), // long | short
    size: numeric("size", { precision: 16, scale: 4, mode: "number" }).notNull(),
    entry: numeric("entry", { precision: 16, scale: 4, mode: "number" }).notNull(),
    exit: numeric("exit", { precision: 16, scale: 4, mode: "number" }),
    pnl: numeric("pnl", { precision: 16, scale: 2, mode: "number" }).notNull().default(0),
    status: text("status").notNull().default("open"), // open | closed | allocated
    notes: text("notes"),
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
  },
  (t) => [index("trades_trader_idx").on(t.traderId, t.openedAt), index("trades_status_idx").on(t.status)],
);

export const tradeAllocations = pgTable(
  "trade_allocations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tradeId: uuid("trade_id")
      .notNull()
      .references(() => trades.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 16, scale: 2, mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("allocations_trade_idx").on(t.tradeId), index("allocations_client_idx").on(t.clientId)],
);

/* -------------------------------------------------------------------------- */
/*                         Notifications / feedback / log                     */
/* -------------------------------------------------------------------------- */

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // balance | withdrawal | feedback | system
    title: text("title").notNull(),
    body: text("body").notNull(),
    data: jsonb("data").$type<Record<string, unknown>>(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.createdAt)],
);

export const feedback = pgTable(
  "feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    assignedTo: uuid("assigned_to").references(() => profiles.id, { onDelete: "set null" }),
    category: text("category").notNull(), // question | concern | complaint | praise
    subject: text("subject").notNull(),
    message: text("message").notNull(),
    status: text("status").notNull().default("open"), // open | in_review | resolved
    priority: text("priority").notNull().default("normal"), // low | normal | high
    firstResponseAt: timestamp("first_response_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("feedback_client_idx").on(t.clientId), index("feedback_status_idx").on(t.status)],
);

export const feedbackMessages = pgTable(
  "feedback_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    feedbackId: uuid("feedback_id")
      .notNull()
      .references(() => feedback.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("feedback_messages_idx").on(t.feedbackId, t.createdAt)],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id").references(() => profiles.id, { onDelete: "set null" }),
    actorName: text("actor_name"),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    before: jsonb("before").$type<Record<string, unknown> | null>(),
    after: jsonb("after").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_actor_idx").on(t.actorId), index("audit_created_idx").on(t.createdAt)],
);

export const contactSubmissions = pgTable("contact_submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  company: text("company"),
  message: text("message").notNull(),
  status: text("status").notNull().default("new"), // new | read | archived
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* -------------------------------------------------------------------------- */
/*                                    CMS                                     */
/* -------------------------------------------------------------------------- */
/* Every CMS table carries `status` (draft | published). Admins edit the draft
   rows; publishing replaces the published rows with a copy of the drafts.     */

export const siteSettings = pgTable("site_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  status: text("status").notNull().default("draft"),
  companyName: text("company_name").notNull().default("Meridian Capital Partners"),
  wordmark: text("wordmark").notNull().default("Meridian"),
  tagline: text("tagline").notNull().default(""),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  addressLine: text("address_line").notNull().default(""),
  linkedinUrl: text("linkedin_url").notNull().default(""),
  xUrl: text("x_url").notNull().default(""),
  seoTitle: text("seo_title").notNull().default(""),
  seoDescription: text("seo_description").notNull().default(""),
  riskDisclosure: text("risk_disclosure").notNull().default(""),
  updatedBy: uuid("updated_by").references(() => profiles.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const heroContent = pgTable("hero_content", {
  id: uuid("id").primaryKey().defaultRandom(),
  status: text("status").notNull().default("draft"),
  eyebrow: text("eyebrow").notNull().default(""),
  headline: text("headline").notNull().default(""),
  subheadline: text("subheadline").notNull().default(""),
  primaryCtaLabel: text("primary_cta_label").notNull().default("Log in"),
  primaryCtaHref: text("primary_cta_href").notNull().default("/login"),
  secondaryCtaLabel: text("secondary_cta_label").notNull().default("Get in touch"),
  secondaryCtaHref: text("secondary_cta_href").notNull().default("/#contact"),
  statLabelOne: text("stat_label_one").notNull().default(""),
  statValueOne: text("stat_value_one").notNull().default(""),
  statLabelTwo: text("stat_label_two").notNull().default(""),
  statValueTwo: text("stat_value_two").notNull().default(""),
  statLabelThree: text("stat_label_three").notNull().default(""),
  statValueThree: text("stat_value_three").notNull().default(""),
  updatedBy: uuid("updated_by").references(() => profiles.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const features = pgTable("features", {
  id: uuid("id").primaryKey().defaultRandom(),
  status: text("status").notNull().default("draft"),
  icon: text("icon").notNull().default("ShieldCheck"),
  title: text("title").notNull(),
  body: text("body").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  updatedBy: uuid("updated_by").references(() => profiles.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const steps = pgTable("steps", {
  id: uuid("id").primaryKey().defaultRandom(),
  status: text("status").notNull().default("draft"),
  title: text("title").notNull(),
  body: text("body").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  updatedBy: uuid("updated_by").references(() => profiles.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const aboutContent = pgTable("about_content", {
  id: uuid("id").primaryKey().defaultRandom(),
  status: text("status").notNull().default("draft"),
  heading: text("heading").notNull().default(""),
  story: text("story").notNull().default(""),
  mission: text("mission").notNull().default(""),
  figureLabelOne: text("figure_label_one").notNull().default(""),
  figureValueOne: text("figure_value_one").notNull().default(""),
  figureLabelTwo: text("figure_label_two").notNull().default(""),
  figureValueTwo: text("figure_value_two").notNull().default(""),
  figureLabelThree: text("figure_label_three").notNull().default(""),
  figureValueThree: text("figure_value_three").notNull().default(""),
  updatedBy: uuid("updated_by").references(() => profiles.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const teamMembers = pgTable("team_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  status: text("status").notNull().default("draft"),
  name: text("name").notNull(),
  role: text("role").notNull(),
  initials: text("initials").notNull().default(""),
  bio: text("bio").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  updatedBy: uuid("updated_by").references(() => profiles.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const faqs = pgTable("faqs", {
  id: uuid("id").primaryKey().defaultRandom(),
  status: text("status").notNull().default("draft"),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  updatedBy: uuid("updated_by").references(() => profiles.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const testimonials = pgTable("testimonials", {
  id: uuid("id").primaryKey().defaultRandom(),
  status: text("status").notNull().default("draft"),
  quote: text("quote").notNull(),
  author: text("author").notNull(),
  authorRole: text("author_role").notNull().default(""),
  rating: integer("rating").notNull().default(5),
  visible: boolean("visible").notNull().default(true),
  approved: boolean("approved").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  updatedBy: uuid("updated_by").references(() => profiles.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const legalPages = pgTable("legal_pages", {
  id: uuid("id").primaryKey().defaultRandom(),
  status: text("status").notNull().default("draft"),
  slug: text("slug").notNull(), // terms | privacy | risk-disclosure
  title: text("title").notNull(),
  body: text("body").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  updatedBy: uuid("updated_by").references(() => profiles.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cmsVersions = pgTable("cms_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  label: text("label").notNull(),
  snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
  createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Profile = typeof profiles.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type WithdrawalRequest = typeof withdrawalRequests.$inferSelect;
export type Trade = typeof trades.$inferSelect;
export type NotificationRow = typeof notifications.$inferSelect;
export type FeedbackRow = typeof feedback.$inferSelect;
export type FeedbackMessage = typeof feedbackMessages.$inferSelect;
export type AuditRow = typeof auditLog.$inferSelect;
