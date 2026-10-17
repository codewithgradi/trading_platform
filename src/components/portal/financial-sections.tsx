"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, ArrowDownLeft, ArrowLeft, ArrowRight, ArrowUpRight, Bell, BookOpen, Check, CircleHelp, Clock3, MessageSquareText, ShieldCheck, TrendingUp, UserRound, Wallet } from "lucide-react";
import { addCustomerNote, markNotifications } from "@/app/actions";
import { AnalyticsCharts } from "@/components/portal/charts";
import { BalanceDialog, StatusBadge, TradeAllocationDialog, TradeLogDialog, WithdrawalRequestDialog, WithdrawalReviewButton } from "@/components/portal/finance-actions";
import { FeedbackSection } from "@/components/portal/feedback-section";
import { PageHeader } from "@/components/portal/page-heading";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { formatCurrency, formatDate, formatNotificationBody, formatNumber, initials } from "@/lib/format";
import type { DashboardData, Role } from "@/lib/types";

type Transaction = DashboardData["transactions"][number];
type Person = DashboardData["people"][number];
type Withdrawal = DashboardData["withdrawals"][number];
type Trade = DashboardData["trades"][number];
const titleCase = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

function TransactionsSection({ role, data, clientId }: { role: Role; data: DashboardData; clientId?: string }) {
  const [type, setType] = useState("all"); const [status, setStatus] = useState("all"); const [period, setPeriod] = useState("all");
  const rows = data.transactions.filter((t) => (!clientId || t.clientId === clientId) && (type === "all" || t.type === type) && (status === "all" || t.status === status) && (period === "all" || new Date(t.createdAt).getTime() >= Date.now() - Number(period) * 86400000));
  const person = data.people.find((p) => p.id === clientId);
  const columns: Column<Transaction>[] = [
    { key: "date", label: "Date & time", render: (row) => <span className="table-date">{formatDate(row.createdAt, true)}</span>, sort: (row) => row.createdAt, csv: (row) => formatDate(row.createdAt, true) },
    { key: "type", label: "Activity", render: (row) => <span className="table-type"><span className={`table-type-icon ${Number(row.amount) >= 0 ? "incoming" : "outgoing"}`}>{Number(row.amount) >= 0 ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}</span><span><strong>{titleCase(row.type)}</strong><small>{row.note || "Account activity"}</small></span></span>, sort: (row) => row.type, csv: (row) => titleCase(row.type) },
    ...(role !== "client" && !clientId ? [{ key: "customer", label: "Customer", render: (row: Transaction) => <span className="table-person">{data.people.find((p) => p.id === row.clientId)?.fullName || "Client"}</span>, sort: (row: Transaction) => data.people.find((p) => p.id === row.clientId)?.fullName || "", csv: (row: Transaction) => data.people.find((p) => p.id === row.clientId)?.fullName || "" }] : []),
    { key: "amount", label: "Amount", render: (row) => <strong className={`numeric ledger-amount ${Number(row.amount) >= 0 ? "positive" : "negative"}`}>{Number(row.amount) >= 0 ? "+" : ""}{formatCurrency(row.amount)}</strong>, sort: (row) => Number(row.amount), csv: (row) => formatCurrency(row.amount) },
    { key: "balance", label: "Balance after", render: (row) => <span className="numeric">{formatCurrency(row.balanceAfter)}</span>, sort: (row) => Number(row.balanceAfter), csv: (row) => formatCurrency(row.balanceAfter) },
    { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} />, sort: (row) => row.status, csv: (row) => row.status },
  ];
  const toolbar = <><select className="filter-select" aria-label="Filter by activity type" value={type} onChange={(e) => setType(e.target.value)}><option value="all">All types</option><option value="deposit">Deposits</option><option value="withdrawal">Withdrawals</option><option value="trade_outcome">Trade outcomes</option><option value="adjustment">Adjustments</option></select><select className="filter-select" aria-label="Filter by date" value={period} onChange={(e) => setPeriod(e.target.value)}><option value="all">All time</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select><select className="filter-select" aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All statuses</option><option value="completed">Completed</option><option value="pending">Pending</option></select></>;
  return <>{!clientId && <PageHeader eyebrow="YOUR ACCOUNT / LEDGER" title={role === "client" ? "Every movement, visible." : "Transaction ledger."} description={role === "client" ? "A complete record of the activity behind your balance. Search, filter or take a copy." : "Explore every recorded balance movement across your customers."} action={<span className="live-chip"><i /> LIVE LEDGER</span>} />}{clientId && <div className="portal-section-head"><div><span className="portal-eyebrow"><span />ACCOUNT RECORD</span><h2>{person?.fullName} ledger</h2></div></div>}<DataTable title={clientId ? undefined : "All transactions"} rows={rows} columns={columns} toolbar={toolbar} searchText={(row) => `${row.type} ${row.note || ""} ${row.reference || ""} ${data.people.find((p) => p.id === row.clientId)?.fullName || ""}`} exportName={`northline-transactions-${clientId ? "customer" : role}-ZAR`} emptyTitle="No transactions found" emptyDescription="Account movements will appear here once they are recorded." /></>;
}

function CustomerList({ data, role }: { data: DashboardData; role: Role }) {
  const clients = data.people.filter((person) => person.role === "client");
  const columns: Column<Person>[] = [
    { key: "name", label: "Customer", render: (row) => <Link href={`/${role}/customers/${row.id}`} className="table-user"><span className="avatar-small">{initials(row.fullName)}</span><span><strong>{row.fullName}</strong><small>{row.email}</small></span></Link>, sort: (row) => row.fullName, csv: (row) => row.fullName },
    { key: "balance", label: "Current balance", render: (row) => <strong className="numeric">{formatCurrency(data.accounts.find((a) => a.clientId === row.id)?.balance)}</strong>, sort: (row) => Number(data.accounts.find((a) => a.clientId === row.id)?.balance || 0), csv: (row) => formatCurrency(data.accounts.find((a) => a.clientId === row.id)?.balance) },
    { key: "activity", label: "Last activity", render: (row) => <span className="table-date">{formatDate(data.transactions.find((t) => t.clientId === row.id)?.createdAt || row.createdAt)}</span>, sort: (row) => data.transactions.find((t) => t.clientId === row.id)?.createdAt || row.createdAt, csv: (row) => formatDate(data.transactions.find((t) => t.clientId === row.id)?.createdAt || row.createdAt) },
    { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} />, sort: (row) => row.status, csv: (row) => row.status },
    { key: "action", label: "", render: (row) => <Link className="table-view-link" href={`/${role}/customers/${row.id}`}>View account <ArrowUpRight size={14} /></Link> },
  ];
  return <><PageHeader eyebrow="TRADER DESK / PEOPLE" title="Your customers." description="Every relationship, account and conversation in one considered view." action={<span className="live-chip"><i /> {clients.length} ASSIGNED</span>} /><div className="customer-summary"><div><span>CLIENTS IN YOUR CARE</span><strong>{formatNumber(clients.length)}</strong></div><div><span>ASSETS UNDER MANAGEMENT</span><strong>{formatCurrency(data.accounts.reduce((sum, a) => sum + Number(a.balance), 0))}</strong></div><div><span>OPEN CONVERSATIONS</span><strong>{data.feedback.filter((f) => f.status !== "resolved").length}</strong></div></div><DataTable title="Customer directory" description="Select a customer for their account, ledger and history." rows={clients} columns={columns} searchText={(row) => `${row.fullName} ${row.email} ${row.phone || ""}`} exportName="northline-customers-ZAR" emptyTitle="No assigned customers" emptyDescription="Clients assigned to you will appear here." /></>;
}

function CustomerDetail({ data, id, role }: { data: DashboardData; id: string; role: Role }) {
  const person = data.people.find((p) => p.id === id)!;
  const balance = Number(data.accounts.find((a) => a.clientId === id)?.balance || 0);
  const ownTransactions = data.transactions.filter((t) => t.clientId === id);
  const assigned = data.assignments.find((a) => a.clientId === id);
  const trader = data.people.find((p) => p.id === assigned?.traderId);
  const feedback = data.feedback.filter((f) => f.clientId === id);
  const notes = data.notes.filter((n) => n.clientId === id);
  const scoped = { ...data, accounts: data.accounts.filter((a) => a.clientId === id), transactions: ownTransactions };
  const [noteBody, setNoteBody] = useState("");
  const router = useRouter();
  const toast = useToast();
  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    const res = await addCustomerNote({ clientId: id, body: noteBody });
    if (res.ok) { toast(res.message); setNoteBody(""); router.refresh(); } else toast(res.error, "error");
  }
  return (
    <div className="customer-detail-page">
      <Link href={`/${role}/${role === "admin" ? "users" : "customers"}`} className="portal-back"><ArrowLeft size={16} /> Back to {role === "admin" ? "users" : "customers"}</Link>
      <PageHeader eyebrow="CUSTOMER / ACCOUNT DETAIL" title={person.fullName} description="A complete view of this relationship, from balance to conversation." action={<BalanceDialog clientId={id} clientName={person.fullName} balance={balance} />} />
      <div className="detail-top-grid">
        <div className="detail-balance-card"><span>LIVE ACCOUNT BALANCE <span className="preview-live"><i /> LIVE</span></span><strong>{formatCurrency(balance)}</strong><p>Updated {formatDate(data.accounts.find((a) => a.clientId === id)?.updatedAt, true)}</p><div><ShieldCheck size={17} /> All changes are recorded in the ledger.</div></div>
        <div className="detail-person-card"><span className="avatar-large">{initials(person.fullName)}</span><div><span>CUSTOMER PROFILE</span><h3>{person.fullName}</h3><a href={`mailto:${person.email}`}>{person.email}</a><p>{person.phone || "No phone number added"}</p><StatusBadge status={person.status} /></div></div>
        <div className="detail-person-card"><span className="avatar-large violet"><UserRound size={28} /></span><div><span>ASSIGNED TRADER</span><h3>{trader?.fullName || "Not assigned"}</h3><p>{trader?.email || "Assign a trader from user management."}</p><span className="detail-small-stat">{ownTransactions.length} ledger entries &middot; {feedback.length} conversations &middot; {notes.length} trader notes</span></div></div>
      </div>
      <div className="portal-section-head detail-chart-head"><div><span className="portal-eyebrow"><span />ACCOUNT PERFORMANCE</span><h2>Balance history</h2></div></div>
      <AnalyticsCharts data={scoped} compact />
      <div className="detail-content-grid">
        <div><TransactionsSection role={role} data={data} clientId={id} /></div>
        <div className="detail-notes">
          <h3>Private trader notes</h3>
          <p>Notes are visible to traders and admins, never to the client.</p>
          <form onSubmit={addNote} className="note-form">
            <textarea value={noteBody} onChange={(e) => setNoteBody(e.target.value)} placeholder="Add a note about this customer… (e.g. call outcome, next steps)" rows={3} aria-label="Add private trader note" />
            <button type="submit" className="button button-small" disabled={noteBody.trim().length < 3}>Save note <ArrowRight size={14} /></button>
          </form>
          <div className="notes-list">
            {notes.length ? notes.map((n) => <div key={n.id} className="detail-note-item"><span className="attention-icon violet"><BookOpen size={16} /></span><div><strong>{n.body}</strong><small>{formatDate(n.createdAt, true)} &middot; {data.people.find((p) => p.id === n.traderId)?.fullName || "Trader"} note</small></div></div>) : <p className="mini-empty">No trader notes yet.</p>}
          </div>
          <div className="detail-divider" />
          <h3>Conversations</h3>
          <div className="notes-list">
            {feedback.slice(0, 5).map((item) => <div key={item.id} className="detail-note-item"><span className="attention-icon violet"><MessageSquareText size={16} /></span><div><strong>{item.subject}</strong><small>{formatDate(item.createdAt)} &middot; {titleCase(item.status)}</small></div></div>)}
            {!feedback.length && <p className="mini-empty">No conversations yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function WithdrawalTimeline({ item }: { item: Withdrawal }) {
  const rejected = item.status === "rejected";
  const current = item.status === "processed" ? 3 : item.status === "approved" ? 2 : item.status === "rejected" ? 2 : 1;
  const steps = ["Requested", "In review", rejected ? "Rejected" : "Approved", "Processed"];
  return <div className="withdrawal-timeline">{steps.map((step, i) => <div key={step} className={i < current ? "complete" : ""}><span>{i < current ? <Check size={12} /> : String(i + 1).padStart(2, "0")}</span><small>{step}</small></div>)}</div>;
}
function WithdrawalsSection({ role, data }: { role: Role; data: DashboardData }) {
  const balance = Number(data.accounts.find((a) => a.clientId === data.me.id)?.balance || 0);
  const pending = data.withdrawals.filter((w) => w.status === "pending").length;
  const columns: Column<Withdrawal>[] = [
    { key: "date", label: "Requested", render: (row) => <span className="table-date">{formatDate(row.createdAt, true)}</span>, sort: (row) => row.createdAt, csv: (row) => formatDate(row.createdAt, true) },
    ...(role !== "client" ? [{ key: "customer", label: "Customer", render: (row: Withdrawal) => <span className="table-user"><span className="avatar-small">{initials(data.people.find((p) => p.id === row.clientId)?.fullName || "Client")}</span><strong>{data.people.find((p) => p.id === row.clientId)?.fullName || "Client"}</strong></span>, sort: (row: Withdrawal) => data.people.find((p) => p.id === row.clientId)?.fullName || "", csv: (row: Withdrawal) => data.people.find((p) => p.id === row.clientId)?.fullName || "" }] : []),
    { key: "amount", label: "Amount", render: (row) => <strong className="numeric">{formatCurrency(row.amount)}</strong>, sort: (row) => Number(row.amount), csv: (row) => formatCurrency(row.amount) },
    { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} />, sort: (row) => row.status, csv: (row) => row.status },
    { key: "note", label: "Note", render: (row) => <span className="table-note">{row.reason || row.note || "—"}</span>, csv: (row) => row.reason || row.note || "" },
    ...(role !== "client" ? [{ key: "actions", label: "Actions", render: (row: Withdrawal) => <div className="table-actions">{row.status === "pending" && <><WithdrawalReviewButton request={row} decision="approved" /><WithdrawalReviewButton request={row} decision="rejected" /></>}{row.status === "approved" && <WithdrawalReviewButton request={row} decision="processed" />}{["processed", "rejected"].includes(row.status) && <span className="table-done">Completed</span>}</div> }] : []),
  ];
  return <><PageHeader eyebrow="ACCOUNT / WITHDRAWALS" title={role === "client" ? "Withdraw with clarity." : "Withdrawal queue."} description={role === "client" ? "Submit a request and follow every step, from review to completion." : "Review requests carefully and keep clients informed at every stage."} action={role === "client" ? <WithdrawalRequestDialog balance={balance} /> : <span className="live-chip"><i /> {pending} AWAITING REVIEW</span>} />{role === "client" && data.withdrawals[0] && <div className="current-withdrawal"><div><span className="portal-eyebrow"><span />LATEST REQUEST</span><h3>{formatCurrency(data.withdrawals[0].amount)}</h3><p>Submitted {formatDate(data.withdrawals[0].createdAt, true)}</p></div><StatusBadge status={data.withdrawals[0].status} /><WithdrawalTimeline item={data.withdrawals[0]} /></div>}{role !== "client" && <div className="customer-summary"><div><span>AWAITING REVIEW</span><strong>{pending}</strong></div><div><span>APPROVED</span><strong>{data.withdrawals.filter((w) => w.status === "approved").length}</strong></div><div><span>PROCESSED TOTAL</span><strong>{formatCurrency(data.withdrawals.filter((w) => w.status === "processed").reduce((sum, w) => sum + Number(w.amount), 0))}</strong></div></div>}<DataTable title={role === "client" ? "Request history" : "All requests"} rows={data.withdrawals} columns={columns} searchText={(row) => `${row.status} ${row.note || ""} ${data.people.find((p) => p.id === row.clientId)?.fullName || ""}`} exportName={`northline-withdrawals-${role}-ZAR`} emptyTitle="No withdrawal requests" emptyDescription={role === "client" ? "You have not requested a withdrawal yet." : "New customer requests will appear here."} /></>;
}
function TradesSection({ data }: { data: DashboardData }) {
  const closed = data.trades.filter((t) => t.status === "closed");
  const columns: Column<Trade>[] = [
    { key: "date", label: "Opened", render: (row) => <span className="table-date">{formatDate(row.openedAt, true)}</span>, sort: (row) => row.openedAt, csv: (row) => formatDate(row.openedAt, true) },
    { key: "instrument", label: "Instrument", render: (row) => <span className="table-type"><span className="table-type-icon incoming"><Activity size={15} /></span><span><strong>{row.instrument}</strong><small>{row.direction.toUpperCase()} &middot; size {row.size}</small></span></span>, sort: (row) => row.instrument, csv: (row) => row.instrument },
    { key: "entry", label: "Entry / exit", render: (row) => <span className="numeric table-date">{formatCurrency(row.entry)} <span className="table-arrow">→</span> {row.exit ? formatCurrency(row.exit) : "Open"}</span>, csv: (row) => `${formatCurrency(row.entry)} / ${row.exit ? formatCurrency(row.exit) : "Open"}` },
    { key: "pnl", label: "P&L", render: (row) => <strong className={`numeric ${Number(row.pnl) >= 0 ? "positive" : "negative"}`}>{Number(row.pnl) >= 0 ? "+" : ""}{formatCurrency(row.pnl)}</strong>, sort: (row) => Number(row.pnl), csv: (row) => formatCurrency(row.pnl) },
    { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} />, sort: (row) => row.status, csv: (row) => row.status },
    { key: "allocation", label: "Allocation", render: (row) => data.allocations.some((a) => a.tradeId === row.id) ? <span className="allocated-label"><Check size={13} /> Allocated</span> : row.status === "closed" ? <TradeAllocationDialog trade={row} data={data} /> : <span className="table-done">Close to allocate</span> },
  ];
  return <><PageHeader eyebrow="TRADER DESK / TRADE RECORD" title="Trades & outcomes." description="A considered record of every position, with clear outcomes and deliberate allocations." action={<TradeLogDialog />} /><div className="customer-summary"><div><span>TOTAL TRADES</span><strong>{data.trades.length}</strong></div><div><span>CLOSED POSITIONS</span><strong>{closed.length}</strong></div><div><span>NET P&L</span><strong>{formatCurrency(closed.reduce((sum, t) => sum + Number(t.pnl), 0))}</strong></div></div><DataTable title="Trade log" rows={data.trades} columns={columns} searchText={(row) => `${row.instrument} ${row.direction} ${row.status} ${row.notes || ""}`} exportName="northline-trades-ZAR" emptyTitle="No trades recorded" emptyDescription="Log your first trade to start building a clear record." /></>;
}
function NotificationsSection({ data }: { data: DashboardData }) {
  const router = useRouter(); const toast = useToast();
  const [filter, setFilter] = useState("all");
  const items = data.notifications.filter((item) => filter === "all" || filter === "unread" && !item.readAt || item.type === filter);
  async function read(ids?: string[]) { const result = await markNotifications(ids); if (result.ok) router.refresh(); else toast(result.error, "error"); }
  return <><PageHeader eyebrow="STAY INFORMED / UPDATES" title="Your notifications." description="A clear record of the updates and moments that matter." action={data.notifications.some((n) => !n.readAt) ? <button type="button" className="button button-outline" onClick={() => void read()}>Mark all as read <Check size={15} /></button> : undefined} /><div className="notification-page"><div className="notification-page-toolbar"><div className="filter-pills">{["all", "unread", "balance", "withdrawal", "feedback"].map((value) => <button type="button" key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{titleCase(value)}</button>)}</div><span>{items.length} updates</span></div>{items.length ? items.map((item) => <button type="button" key={item.id} className={`notification-row ${item.readAt ? "" : "unread"}`} onClick={() => { if (!item.readAt) void read([item.id]); }}><span className="notification-page-icon"><Bell size={18} /></span><span><strong>{item.title}</strong><small>{formatNotificationBody(item)}</small><em>{formatDate(item.createdAt, true)}</em></span>{!item.readAt && <i className="unread-dot" />}</button>) : <EmptyState title="Nothing in this view" description="New updates will appear here as your account changes." />}</div></>;
}
function HelpSection() { return <><PageHeader eyebrow="HELP / GETTING AROUND" title="Here when you need us." description="Find your way around the portal or get in touch with a real person." /><div className="help-grid"><div className="help-card"><span className="icon-badge"><BookOpen size={22} /></span><h3>Take the guided tour</h3><p>Revisit the essentials at your own pace. Your dashboard, balance, withdrawals and messages, explained.</p><button type="button" className="button" onClick={() => window.dispatchEvent(new Event("replay-tour"))}>Replay the guide <ArrowRight size={15} /></button></div><div className="help-card"><span className="icon-badge"><MessageSquareText size={22} /></span><h3>Talk to our team</h3><p>Have a question about your account? Start a private conversation with the people looking after it.</p><Link className="button button-outline" href="/client/feedback">Send a message <ArrowUpRight size={15} /></Link></div><div className="help-card"><span className="icon-badge"><CircleHelp size={22} /></span><h3>Common questions</h3><p>Clear answers about your portal, withdrawals, trading and how we keep you in the loop.</p><Link className="button button-outline" href="/#faq">Read the FAQs <ArrowUpRight size={15} /></Link></div></div><div className="help-note"><ShieldCheck size={18} />Trading carries risk, including the possible loss of capital. <Link href="/legal/risk">Read the risk disclosure <ArrowRight size={14} /></Link></div></>; }

export function FinancialSection({ role, section, data, detailId }: { role: Role; section: string; data: DashboardData; detailId?: string }) {
  if (section === "transactions") return <TransactionsSection role={role} data={data} />;
  if (section === "customers") return <CustomerList role={role} data={data} />;
  if (section === "customer-detail" && detailId) return <CustomerDetail role={role} data={data} id={detailId} />;
  if (section === "withdrawals") return <WithdrawalsSection role={role} data={data} />;
  if (section === "trades") return <TradesSection data={data} />;
  if (section === "feedback") return <FeedbackSection role={role} data={data} />;
  if (section === "notifications") return <NotificationsSection data={data} />;
  if (section === "help") return <HelpSection />;
  return <EmptyState title="This page is unavailable" description="Return to your overview to continue." />;
}
