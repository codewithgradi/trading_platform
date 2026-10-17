"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useQueryClient } from "@tanstack/react-query";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import * as Dialog from "@radix-ui/react-dialog";
import { Activity, ArrowRight, Bell, BookOpen, ChartNoAxesCombined, ChevronDown, ChevronRight, CircleHelp, ClipboardList, ContactRound, FilePenLine, LayoutDashboard, LogOut, Menu, MessageSquareText, Settings2, ShieldCheck, UsersRound, Wallet, X, type LucideIcon } from "lucide-react";
import { Brand } from "@/components/public/site-header";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { OnboardingTour } from "@/components/portal/onboarding-tour";
import { useToast } from "@/components/ui/toast";
import { markNotifications } from "@/app/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatDate, formatNotificationBody, initials } from "@/lib/format";
import type { ActionResult, DashboardData, Role } from "@/lib/types";

type Item = { label: string; href: string; icon: LucideIcon; key: string };
function getNav(role: Role): Item[] {
  const base = `/${role}`;
  if (role === "admin") return [
    { label: "Overview", href: base, icon: LayoutDashboard, key: "overview" }, { label: "Users", href: `${base}/users`, icon: UsersRound, key: "users" }, { label: "Content studio", href: `${base}/cms`, icon: FilePenLine, key: "cms" }, { label: "Analytics", href: `${base}/analytics`, icon: ChartNoAxesCombined, key: "analytics" }, { label: "Withdrawals", href: `${base}/withdrawals`, icon: Wallet, key: "withdrawals" }, { label: "Feedback", href: `${base}/feedback`, icon: MessageSquareText, key: "feedback" }, { label: "Enquiries", href: `${base}/contact`, icon: ContactRound, key: "contact" }, { label: "Audit trail", href: `${base}/audit`, icon: ClipboardList, key: "audit" }, { label: "Settings", href: `${base}/settings`, icon: Settings2, key: "settings" },
  ];
  if (role === "trader") return [
    { label: "Overview", href: base, icon: LayoutDashboard, key: "overview" }, { label: "Customers", href: `${base}/customers`, icon: UsersRound, key: "customers" }, { label: "Trades", href: `${base}/trades`, icon: Activity, key: "trades" }, { label: "Withdrawals", href: `${base}/withdrawals`, icon: Wallet, key: "withdrawals" }, { label: "Feedback inbox", href: `${base}/feedback`, icon: MessageSquareText, key: "feedback" }, { label: "Analytics", href: `${base}/analytics`, icon: ChartNoAxesCombined, key: "analytics" }, { label: "Notifications", href: `${base}/notifications`, icon: Bell, key: "notifications" }, { label: "Profile", href: `${base}/profile`, icon: Settings2, key: "profile" },
  ];
  return [
    { label: "Overview", href: base, icon: LayoutDashboard, key: "overview" }, { label: "Transactions", href: `${base}/transactions`, icon: ClipboardList, key: "transactions" }, { label: "Withdrawals", href: `${base}/withdrawals`, icon: Wallet, key: "withdrawals" }, { label: "Messages", href: `${base}/feedback`, icon: MessageSquareText, key: "feedback" }, { label: "Notifications", href: `${base}/notifications`, icon: Bell, key: "notifications" }, { label: "Profile", href: `${base}/profile`, icon: Settings2, key: "profile" }, { label: "Help & guide", href: `${base}/help`, icon: CircleHelp, key: "help" },
  ];
}
function NotificationBell({ role, items }: { role: Role; items: DashboardData["notifications"] }) {
  const router = useRouter();
  const toast = useToast();
  const unread = items.filter((item) => !item.readAt).length;
  return <Dropdown.Root><Dropdown.Trigger asChild><button type="button" className="top-icon-button notification-trigger" aria-label={`${unread} unread notifications`} data-tour="notifications"><Bell size={19} strokeWidth={1.8} />{unread > 0 && <span>{unread > 9 ? "9+" : unread}</span>}</button></Dropdown.Trigger><Dropdown.Portal><Dropdown.Content align="end" sideOffset={12} className="notification-menu"><div className="notification-menu-head"><div><strong>Notifications</strong><small>{unread ? `${unread} unread updates` : "You're all caught up"}</small></div>{unread > 0 && <button type="button" onClick={async () => { const result = await markNotifications(); if (result.ok) router.refresh(); else toast(result.error, "error"); }}>Mark all read</button>}</div><div className="notification-menu-list">{items.length ? items.slice(0, 4).map((item) => <Dropdown.Item key={item.id} asChild><Link href={`/${role}/notifications`} className={`notification-menu-item ${item.readAt ? "" : "unread"}`}><span className="notification-list-icon"><Bell size={15} /></span><span><strong>{item.title}</strong><small>{formatNotificationBody(item)}</small><em>{formatDate(item.createdAt, true)}</em></span></Link></Dropdown.Item>) : <p className="notification-menu-empty">Important updates will appear here.</p>}</div><Dropdown.Item asChild><Link href={`/${role}/notifications`} className="notification-menu-footer">View all notifications <ArrowRight size={15} /></Link></Dropdown.Item></Dropdown.Content></Dropdown.Portal></Dropdown.Root>;
}
export function DashboardShell({ role, me, notifications, children }: { role: Role; me: DashboardData["me"]; notifications: DashboardData["notifications"]; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { setTheme } = useTheme();
  const [drawer, setDrawer] = useState(false);
  const nav = getNav(role);
  const current = [...nav].reverse().find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)) || nav[0];
  useEffect(() => { if (me.theme) setTheme(me.theme); }, [me.theme, setTheme]);
  useEffect(() => {
    const client = createSupabaseBrowserClient();
    if (!client) { const timer = window.setInterval(() => router.refresh(), 60_000); return () => window.clearInterval(timer); }
    const channel = client.channel(`portal-${me.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${me.id}` }, () => { void queryClient.invalidateQueries(); router.refresh(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "accounts" }, () => { void queryClient.invalidateQueries(); router.refresh(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => { void queryClient.invalidateQueries(); router.refresh(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawal_requests" }, () => { void queryClient.invalidateQueries(); router.refresh(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "feedback" }, () => { void queryClient.invalidateQueries(); router.refresh(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "trades" }, () => { void queryClient.invalidateQueries(); router.refresh(); })
      .subscribe();
    return () => { void client.removeChannel(channel); };
  }, [me.id, router, queryClient]);
  async function signOut(): Promise<ActionResult> {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (!response.ok) return { ok: false, error: "Unable to sign out. Try again." };
    router.push("/login"); router.refresh(); return { ok: true, message: "You have signed out securely." };
  }
  const navContent = <><div className="sidebar-brand"><Brand inverse /><span className="sidebar-brand-caption">THE PORTAL</span></div><div className="sidebar-workspace"><span className="workspace-icon"><ShieldCheck size={16} /></span><span><small>WORKSPACE</small><strong>{role === "admin" ? "Administration" : role === "trader" ? "Trader desk" : "My account"}</strong></span><ChevronDown size={14} /></div><div className="sidebar-section-label">WORKSPACE</div><nav className="sidebar-nav" aria-label={`${role} navigation`}>{nav.map((item) => { const Icon = item.icon; const active = current.key === item.key; return <Link href={item.href} key={item.key} className={active ? "active" : ""} onClick={() => setDrawer(false)} data-tour={`nav-${item.key}`}><Icon size={18} strokeWidth={1.8} /><span>{item.label}</span>{active && <span className="nav-active-mark" />}</Link>; })}</nav><div className="sidebar-bottom"><div className="sidebar-help"><BookOpen size={18} /><div><strong>Need a hand?</strong><span>Your guide is always here.</span></div><button type="button" aria-label="Replay guide" onClick={() => window.dispatchEvent(new Event("replay-tour"))}><ArrowRight size={16} /></button></div><div className="sidebar-user"><span className="user-avatar">{initials(me.fullName)}</span><span><strong>{me.fullName}</strong><small>{role === "admin" ? "Administrator" : role === "trader" ? "Trader" : "Client"}</small></span><ConfirmDialog trigger={<button type="button" title="Sign out" aria-label="Sign out"><LogOut size={17} /></button>} title="Sign out of Northline?" description="Your current session will end. You can sign back in whenever you need." actionLabel="Sign out" onConfirm={signOut} /></div></div></>;
  const mobileItems = nav.slice(0, 4);
  return <div className="portal-shell"><aside className="portal-sidebar">{navContent}</aside><div className="portal-main"><header className="portal-topbar"><div className="topbar-left"><button type="button" className="top-icon-button mobile-top-menu" onClick={() => setDrawer(true)} aria-label="Open navigation"><Menu size={22} /></button><div className="breadcrumb"><span>{role === "admin" ? "ADMIN" : role === "trader" ? "TRADER" : "CLIENT"} PORTAL</span><ChevronRight size={13} /><strong>{current.label}</strong></div></div><div className="topbar-actions"><span className="topbar-date">{new Intl.DateTimeFormat("en-ZA", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Johannesburg" }).format(new Date())}</span><ThemeToggle loggedIn /><NotificationBell role={role} items={notifications} /><Link className="topbar-avatar" href={`/${role}/${role === "admin" ? "settings" : "profile"}`} aria-label="Your profile" data-tour="profile">{initials(me.fullName)}</Link></div></header><main className="portal-content">{children}</main></div><nav className="mobile-tabbar" aria-label="Mobile portal navigation">{mobileItems.map((item) => { const Icon = item.icon; return <Link key={item.key} href={item.href} className={current.key === item.key ? "active" : ""}><Icon size={21} strokeWidth={1.8} /><span>{item.label.split(" ")[0]}</span></Link>; })}<button type="button" onClick={() => setDrawer(true)}><Menu size={21} /><span>More</span></button></nav><Dialog.Root open={drawer} onOpenChange={setDrawer}><Dialog.Portal><Dialog.Overlay className="drawer-overlay" /><Dialog.Content className="portal-mobile-drawer"><Dialog.Title className="sr-only">Portal navigation</Dialog.Title><button type="button" className="drawer-close" onClick={() => setDrawer(false)} aria-label="Close navigation"><X size={20} /></button>{navContent}</Dialog.Content></Dialog.Portal></Dialog.Root><OnboardingTour role={role} completed={me.onboardingCompleted} /></div>;
}
