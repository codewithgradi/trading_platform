import type { ReactNode } from "react";

import { OnboardingTour } from "@/components/features/onboarding-tour";
import { PortalShell, type NavItem } from "@/components/features/portal-shell";
import { requireRole } from "@/lib/auth";

const NAV: NavItem[] = [
  { href: "/admin", label: "Overview", icon: "LayoutDashboard", tour: "nav-overview" },
  { href: "/admin/users", label: "People", icon: "Users", tour: "nav-users" },
  { href: "/admin/cms", label: "Content", icon: "FileText", tour: "nav-cms" },
  { href: "/admin/analytics", label: "Analytics", icon: "BarChart3", tour: "nav-analytics" },
  { href: "/admin/audit", label: "Audit log", icon: "ShieldCheck", tour: "nav-audit" },
  { href: "/admin/enquiries", label: "Enquiries", icon: "MessageSquare" },
  { href: "/admin/security", label: "Security", icon: "Settings" },
  { href: "/admin/notifications", label: "Notifications", icon: "Bell" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireRole("admin");

  return (
    <PortalShell
      portalName="Admin console"
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
      <OnboardingTour role="admin" completed={user.onboardingCompleted} />
    </PortalShell>
  );
}
