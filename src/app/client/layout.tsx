import type { ReactNode } from "react";

import { OnboardingTour } from "@/components/features/onboarding-tour";
import { PortalShell, type NavItem } from "@/components/features/portal-shell";
import { requireRole } from "@/lib/auth";

const NAV: NavItem[] = [
  { href: "/client", label: "Dashboard", icon: "LayoutDashboard", tour: "nav-dashboard" },
  { href: "/client/transactions", label: "Transactions", icon: "Receipt", tour: "nav-transactions" },
  { href: "/client/withdrawals", label: "Withdrawals", icon: "Wallet", tour: "nav-withdrawals" },
  { href: "/client/feedback", label: "Feedback", icon: "MessageSquare", tour: "nav-feedback" },
  { href: "/client/notifications", label: "Notifications", icon: "Bell", tour: "nav-notifications" },
  { href: "/client/profile", label: "Profile", icon: "Settings", tour: "nav-profile" },
  { href: "/client/help", label: "Help", icon: "LifeBuoy", tour: "nav-help" },
];

export default async function ClientLayout({ children }: { children: ReactNode }) {
  const user = await requireRole("client");

  return (
    <PortalShell
      portalName="Client portal"
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
      <OnboardingTour role="client" completed={user.onboardingCompleted} />
    </PortalShell>
  );
}
