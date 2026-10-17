import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getDashboardData } from "@/lib/queries";
import type { Role } from "@/lib/types";
import { PortalView } from "@/components/portal/portal-view";
export const dynamic = "force-dynamic";
const sections: Record<Role, string[]> = { admin: ["users", "cms", "analytics", "withdrawals", "feedback", "contact", "audit", "settings", "notifications"], trader: ["customers", "trades", "withdrawals", "feedback", "analytics", "notifications", "profile"], client: ["transactions", "withdrawals", "feedback", "notifications", "profile", "help", "analytics"] };
export default async function SectionPage({ params }: { params: Promise<{ role: string; section: string }> }) {
  const { role, section } = await params;
  if (!["admin", "trader", "client"].includes(role) || !sections[role as Role].includes(section)) notFound();
  const me = await requireRole(role as Role);
  return <PortalView role={role as Role} section={section} data={await getDashboardData(me)} />;
}
