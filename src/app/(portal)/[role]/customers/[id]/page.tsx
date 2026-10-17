import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getDashboardData } from "@/lib/queries";
import type { Role } from "@/lib/types";
import { PortalView } from "@/components/portal/portal-view";
export const dynamic = "force-dynamic";
export default async function CustomerPage({ params }: { params: Promise<{ role: string; id: string }> }) {
  const { role, id } = await params;
  if (!["trader", "admin"].includes(role)) notFound();
  const me = await requireRole(role as Role);
  const data = await getDashboardData(me);
  if (!data.people.some((person) => person.id === id && person.role === "client")) notFound();
  return <PortalView role={role as Role} section="customer-detail" detailId={id} data={data} />;
}
