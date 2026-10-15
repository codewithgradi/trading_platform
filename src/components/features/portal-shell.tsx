"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  Briefcase,
  FileText,
  Home,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  MessageSquare,
  Receipt,
  Settings,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
  X,
} from "lucide-react";

import { NotificationBell } from "@/components/features/notification-bell";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn, initials, roleLabel } from "@/lib/utils";
import { persistThemeAction, signOutAction } from "@/app/actions/session";

export type NavItem = { href: string; label: string; icon: keyof typeof iconMap; tour?: string };

const iconMap = {
  Activity,
  BarChart3,
  BookOpen,
  Briefcase,
  FileText,
  Home,
  LayoutDashboard,
  LifeBuoy,
  MessageSquare,
  Receipt,
  Settings,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
  Bell,
};

export function PortalShell({
  user,
  nav,
  children,
  portalName,
}: {
  user: { id: string; fullName: string; role: string; avatarUrl: string | null; email: string };
  nav: NavItem[];
  children: React.ReactNode;
  portalName: string;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  React.useEffect(() => setDrawerOpen(false), [pathname]);

  const isActive = (href: string) =>
    pathname === href || (href !== `/${user.role}` && pathname.startsWith(`${href}/`));

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="flex flex-col gap-0.5" aria-label={`${portalName} navigation`}>
      {nav.map((item) => {
        const Icon = iconMap[item.icon];
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            data-tour={item.tour}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-[13.5px] font-medium transition-colors",
              active ? "bg-surface text-ink" : "text-ink-2 hover:bg-surface hover:text-ink",
            )}
          >
            {active ? (
              <motion.span
                layoutId="nav-active"
                className="absolute left-0 h-5 w-[2px] rounded-full bg-ink"
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              />
            ) : null}
            <Icon className="h-[17px] w-[17px] shrink-0" strokeWidth={1.8} />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-dvh bg-bg">
      {/* Sidebar — desktop */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-line bg-bg px-3 py-5 lg:flex">
        <Link href="/" className="mb-7 flex items-center gap-2.5 px-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-inverse text-[13px] font-bold text-on-inverse">
            M
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-ink">Meridian</span>
        </Link>
        <p className="mb-2 px-3 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-3">
          {portalName}
        </p>
        <NavLinks />
        <div className="mt-auto space-y-1 border-t border-line pt-4">
          <Link
            href={`/${user.role}/profile`}
            className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-surface"
          >
            <Avatar name={user.fullName} src={user.avatarUrl} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-ink">{user.fullName}</span>
              <span className="block truncate text-[11.5px] text-ink-3">{roleLabel[user.role]}</span>
            </span>
          </Link>
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex min-h-[40px] w-full items-center gap-3 rounded-lg px-3 text-[13px] font-medium text-ink-2 transition-colors hover:bg-surface hover:text-ink"
            >
              <LogOut className="h-[17px] w-[17px]" strokeWidth={1.8} />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawerOpen ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-y-0 left-0 z-50 flex w-[82%] max-w-xs flex-col border-r border-line bg-bg px-3 py-5 lg:hidden"
            >
              <div className="mb-6 flex items-center justify-between px-2">
                <span className="text-[15px] font-semibold tracking-tight text-ink">Meridian</span>
                <button
                  type="button"
                  aria-label="Close navigation"
                  onClick={() => setDrawerOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink-2"
                >
                  <X className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>
              <NavLinks onNavigate={() => setDrawerOpen(false)} />
              <div className="mt-auto border-t border-line pt-4">
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 text-[13px] font-medium text-ink-2"
                  >
                    <LogOut className="h-[17px] w-[17px]" strokeWidth={1.8} />
                    Sign out
                  </button>
                </form>
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      {/* Main column */}
      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-bg/85 px-4 backdrop-blur-md sm:px-6">
          <button
            type="button"
            aria-label="Open navigation"
            onClick={() => setDrawerOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-line text-ink-2 lg:hidden"
          >
            <Menu className="h-4 w-4" strokeWidth={2} />
          </button>
          <span className="text-[13px] font-semibold text-ink lg:hidden">Meridian</span>
          <div className="ml-auto flex items-center gap-2">
            <NotificationBell role={user.role} />
            <ThemeToggle onPersist={(theme) => void persistThemeAction(theme)} />
            <Link
              href={`/${user.role}/profile`}
              className="hidden lg:block"
              aria-label="Open your profile"
            >
              <Avatar name={user.fullName} src={user.avatarUrl} />
            </Link>
          </div>
        </header>

        <main className="px-4 pb-24 pt-6 sm:px-6 lg:pb-12">{children}</main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-bg/95 backdrop-blur-md lg:hidden"
      >
        {nav.slice(0, 5).map((item) => {
          const Icon = iconMap[item.icon];
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 text-[10.5px] font-medium transition-colors",
                active ? "text-ink" : "text-ink-3",
              )}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
              <span className="truncate">{item.label.split(" ")[0]}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function Avatar({
  name,
  src,
  size = 32,
}: {
  name: string;
  src?: string | null;
  size?: number;
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className="rounded-full border border-line object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className="flex items-center justify-center rounded-full border border-line bg-surface text-[11px] font-semibold text-ink-2"
      style={{ width: size, height: size }}
    >
      {initials(name)}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-[26px] font-bold leading-tight tracking-tight text-ink sm:text-[30px]">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-[14px] text-ink-2">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}
