// Schema-aligned Supabase client types. Regenerate from the deployed project with
// `supabase gen types typescript --project-id <id>` after changing the SQL migration.
import type * as tables from "@/db/schema";

type Serializable<T> = T extends Date ? string : T extends Array<infer U> ? Serializable<U>[] : T extends object ? { [K in keyof T]: Serializable<T[K]> } : T;
type Table<T extends { $inferSelect: object; $inferInsert: object }> = {
  Row: Serializable<T["$inferSelect"]>;
  Insert: Serializable<T["$inferInsert"]>;
  Update: Partial<Serializable<T["$inferInsert"]>>;
  Relationships: [];
};
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export type Database = {
  public: {
    Tables: {
      profiles: Table<typeof tables.profiles>;
      trader_clients: Table<typeof tables.traderClients>;
      accounts: Table<typeof tables.accounts>;
      transactions: Table<typeof tables.transactions>;
      withdrawal_requests: Table<typeof tables.withdrawalRequests>;
      trades: Table<typeof tables.trades>;
      trade_allocations: Table<typeof tables.tradeAllocations>;
      notifications: Table<typeof tables.notifications>;
      feedback: Table<typeof tables.feedback>;
      feedback_messages: Table<typeof tables.feedbackMessages>;
      audit_log: Table<typeof tables.auditLog>;
      contact_submissions: Table<typeof tables.contactSubmissions>;
      cms_documents: Table<typeof tables.cmsDocuments>;
      cms_versions: Table<typeof tables.cmsVersions>;
      faqs: Table<typeof tables.faqs>;
      testimonials: Table<typeof tables.testimonials>;
      team_members: Table<typeof tables.teamMembers>;
      customer_notes: Table<typeof tables.customerNotes>;
    };
    Views: Record<string, never>;
    Functions: {
      get_published_content: { Args: Record<string, never>; Returns: { key: string; published: Json }[] };
      apply_balance_change: { Args: { p_client: string; p_type: string; p_amount: number; p_note: string; p_reference: string | null; p_idempotency: string }; Returns: Json };
      process_withdrawal: { Args: { p_request: string }; Returns: Json };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
