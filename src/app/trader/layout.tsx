import type { ReactNode } from "react";

import { OnboardingTour } from "@/components/features/onboarding-tour";
import { PortalShell, type NavItem } from "@/components/features/portal-shell";
import { requireRole } from "@/lib/auth";

const NAV: NavItem[] = [
  { href: "/trader", label: "Overview", icon: "LayoutDashboard", tour: "nav-overview" },
  { href: "/trader/customers", label: "Customers", icon: "Users", tour: "nav-customers" },
  { href: "/trader/trades", label: "Trades", icon: "TrendingUp", tour: "nav-trades" },
  { href: "/trader/withdrawals", label: "Withdrawals", icon: "Wallet", tour: "nav-withdrawals" },
  { href: "/trader/feedback", label: "Feedback", icon: "MessageSquare", tour: "nav-feedback" },
  { href: "/trader/analytics", label: "Analytics", icon: "BarChart3", tour: "nav-analytics" },
  { href: "/trader/notifications", label: "Notifications", icon: "Bell" },
  { href: "/trader/profile", label: "Profile", icon: "Settings" },
];

export default async function TraderLayout({ children }: { children: ReactNode }) {
  const user = await requireRole("trader");

  return (
    <PortalShell
      portalName="Trader desk"
      nav={NAV}
      user={{
        id: user.id,
        fullName: user.fullName,
        role: user.role,
        avatarUrl: user.avatarUrl,
        email: user.email,
      }}
    >
      {children}
      <OnboardingTour role="trader" completed={user.onboardingCompleted} />
    </PortalShell>
  );
}
