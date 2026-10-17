import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { accounts, auditLog, cmsDocuments, cmsVersions, contactSubmissions, customerNotes, faqs, feedback, feedbackMessages, notifications, profiles, teamMembers, testimonials, tradeAllocations, traderClients, trades, transactions, withdrawalRequests } from "@/db/schema";
import { defaultContent, fallbackFaqs, fallbackTeam, fallbackTestimonials, type PublicContent } from "@/lib/content";
import type { DashboardData } from "@/lib/types";

type ProfileRecord = typeof profiles.$inferSelect;
export async function getPublicContent() {
  const content: PublicContent = structuredClone(defaultContent);
  let faqItems = fallbackFaqs.map(({ id, question, answer }) => ({ id, question, answer }));
  let quotes = fallbackTestimonials;
  let team = fallbackTeam;
  try {
    const [docs, faqRows, quoteRows, teamRows] = await Promise.all([
      db.select().from(cmsDocuments),
      db.select().from(faqs).where(eq(faqs.status, "published")).orderBy(faqs.sortOrder),
      db.select().from(testimonials).where(eq(testimonials.status, "published")).orderBy(testimonials.sortOrder),
      db.select().from(teamMembers).where(eq(teamMembers.status, "published")).orderBy(teamMembers.sortOrder),
    ]);
    for (const doc of docs) {
      if (doc.key in content) {
        const key = doc.key as keyof PublicContent;
        Object.assign(content[key], doc.published);
      }
    }
    if (faqRows.length) faqItems = faqRows.map((item) => ({ id: item.id, question: item.question, answer: item.answer }));
    if (quoteRows.length) quotes = quoteRows.map((item) => ({ id: item.id, quote: item.quote, name: item.name, role: item.role, rating: item.rating, avatarUrl: item.avatarUrl || "" }));
    if (teamRows.length) team = teamRows.map((item) => ({ id: item.id, name: item.name, role: item.role, bio: item.bio || "", avatarUrl: item.avatarUrl || "" }));
  } catch { /* Default published content is available before first migration or seed. */ }
  return { content, faqs: faqItems, testimonials: quotes, team };
}

export async function getDashboardData(me: ProfileRecord): Promise<DashboardData> {
  const role = me.role;
  const allAssignments = role === "admin" ? await db.select().from(traderClients) : role === "trader" ? await db.select().from(traderClients).where(eq(traderClients.traderId, me.id)) : await db.select().from(traderClients).where(eq(traderClients.clientId, me.id));
  const clientIds = role === "client" ? [me.id] : role === "admin" ? (await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.role, "client"))).map((item) => item.id) : allAssignments.map((item) => item.clientId);
  const peopleIds = role === "client" ? [me.id, ...allAssignments.map((a) => a.traderId)] : role === "trader" ? [me.id, ...clientIds] : [];
  const personRows = role === "admin" ? await db.select().from(profiles).orderBy(desc(profiles.createdAt)) : await db.select().from(profiles).where(inArray(profiles.id, peopleIds));
  const [accountRows, transactionRows, withdrawalRows, tradeRows, notifRows, feedbackRows, auditRows, contactRows, cmsRows, faqRows, quoteRows, teamRows, versionRows, noteRows] = await Promise.all([
    clientIds.length ? db.select().from(accounts).where(inArray(accounts.clientId, clientIds)) : Promise.resolve([]),
    clientIds.length ? db.select().from(transactions).where(inArray(transactions.clientId, clientIds)).orderBy(desc(transactions.createdAt)).limit(3000) : Promise.resolve([]),
    role === "admin" ? db.select().from(withdrawalRequests).orderBy(desc(withdrawalRequests.createdAt)) : clientIds.length ? db.select().from(withdrawalRequests).where(inArray(withdrawalRequests.clientId, clientIds)).orderBy(desc(withdrawalRequests.createdAt)) : Promise.resolve([]),
    role === "admin" ? db.select().from(trades).orderBy(desc(trades.openedAt)).limit(500) : role === "trader" ? db.select().from(trades).where(eq(trades.traderId, me.id)).orderBy(desc(trades.openedAt)).limit(500) : Promise.resolve([]),
    db.select().from(notifications).where(eq(notifications.userId, me.id)).orderBy(desc(notifications.createdAt)).limit(100),
    role === "admin" ? db.select().from(feedback).orderBy(desc(feedback.createdAt)) : clientIds.length ? db.select().from(feedback).where(inArray(feedback.clientId, clientIds)).orderBy(desc(feedback.createdAt)) : Promise.resolve([]),
    role === "admin" ? db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(300) : role === "trader" ? db.select().from(auditLog).where(eq(auditLog.actorId, me.id)).orderBy(desc(auditLog.createdAt)).limit(80) : Promise.resolve([]),
    role === "admin" ? db.select().from(contactSubmissions).orderBy(desc(contactSubmissions.createdAt)).limit(200) : Promise.resolve([]),
    role === "admin" ? db.select().from(cmsDocuments) : Promise.resolve([]),
    role === "admin" ? db.select().from(faqs).orderBy(faqs.sortOrder) : Promise.resolve([]),
    role === "admin" ? db.select().from(testimonials).orderBy(testimonials.sortOrder) : Promise.resolve([]),
    role === "admin" ? db.select().from(teamMembers).orderBy(teamMembers.sortOrder) : Promise.resolve([]),
    role === "admin" ? db.select().from(cmsVersions).orderBy(desc(cmsVersions.createdAt)).limit(40) : Promise.resolve([]),
    clientIds.length && role !== "admin" ? db.select().from(customerNotes).where(inArray(customerNotes.clientId, clientIds)).orderBy(desc(customerNotes.createdAt)).limit(200) : role === "admin" ? db.select().from(customerNotes).orderBy(desc(customerNotes.createdAt)).limit(200) : Promise.resolve([]),
  ]);
  const messageRows = feedbackRows.length ? await db.select().from(feedbackMessages).where(inArray(feedbackMessages.feedbackId, feedbackRows.map((f) => f.id))).orderBy(feedbackMessages.createdAt) : [];
  const allocationRows = tradeRows.length ? await db.select().from(tradeAllocations).where(inArray(tradeAllocations.tradeId, tradeRows.map((t) => t.id))) : [];
  return JSON.parse(JSON.stringify({
    me: { id: me.id, role: me.role, fullName: me.fullName, email: me.email, phone: me.phone, avatarUrl: me.avatarUrl, theme: me.theme, onboardingCompleted: me.onboardingCompleted, status: me.status, notificationPreferences: me.notificationPreferences },
    people: personRows.map((p) => ({ id: p.id, role: p.role, fullName: p.fullName, email: p.email, phone: p.phone, avatarUrl: p.avatarUrl, status: p.status, createdAt: p.createdAt })),
    assignments: allAssignments.map((a) => ({ clientId: a.clientId, traderId: a.traderId })),
    accounts: accountRows,
    transactions: transactionRows,
    withdrawals: withdrawalRows,
    trades: tradeRows,
    allocations: allocationRows,
    notifications: notifRows,
    feedback: feedbackRows,
    messages: messageRows,
    audits: auditRows,
    contacts: contactRows,
    cms: cmsRows,
    faqs: faqRows,
    testimonials: quoteRows,
    team: teamRows,
    versions: versionRows,
    notes: noteRows,
  })) as DashboardData;
}
