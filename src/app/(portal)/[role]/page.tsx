import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getDashboardData } from "@/lib/queries";
import type { Role } from "@/lib/types";
import { PortalView } from "@/components/portal/portal-view";
export const dynamic = "force-dynamic";
export default async function OverviewPage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  if (!["admin", "trader", "client"].includes(role)) notFound();
  const me = await requireRole(role as Role);
  return <PortalView role={role as Role} section="overview" data={await getDashboardData(me)} />;
}
