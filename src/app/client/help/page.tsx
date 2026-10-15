import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, LifeBuoy, MessageSquare, Wallet } from "lucide-react";

import { ReplayTourButton } from "@/components/features/onboarding-tour";
import { PageHeader } from "@/components/features/portal-shell";
import { Card, CardHeader } from "@/components/ui/primitives";
import { requireRole } from "@/lib/auth";
import { getCmsBundle } from "@/lib/cms";

export const metadata: Metadata = { title: "Help" };

export default async function ClientHelpPage() {
  await requireRole("client");
  const cms = await getCmsBundle("published");

  return (
    <>
      <PageHeader
        title="Help & guidance"
        description="Re-run the portal tour, read the common questions, or reach the desk directly."
        action={<ReplayTourButton label="Replay the guided tour" />}
      />

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Frequently asked" description="The same answers published on our website" />
          <dl className="divide-y divide-[var(--border)]">
            {cms.faqs.map((item) => (
              <div key={item.id} className="px-5 py-4">
                <dt className="text-[14px] font-semibold tracking-tight text-ink">{item.question}</dt>
                <dd className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">{item.answer}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Quick links" />
            <ul className="divide-y divide-[var(--border)]">
              {[
                { href: "/client/withdrawals", label: "Request a withdrawal", icon: Wallet },
                { href: "/client/feedback", label: "Raise a concern with the desk", icon: MessageSquare },
                { href: "/client/transactions", label: "Download your statement (CSV)", icon: BookOpen },
                { href: "/legal/risk-disclosure", label: "Read the risk disclosure", icon: LifeBuoy },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 px-5 py-3.5 text-[13.5px] text-ink-2 transition-colors hover:bg-surface hover:text-ink"
                  >
                    <item.icon className="h-4 w-4" strokeWidth={1.8} />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Talk to a human" />
            <div className="space-y-2 p-5 text-[13.5px] text-ink-2">
              <p>
                <span className="font-medium text-ink">Email</span> · {cms.settings?.email}
              </p>
              <p>
                <span className="font-medium text-ink">Phone</span> · {cms.settings?.phone}
              </p>
              <p className="pt-2 text-[12.5px] text-ink-3">
                The desk is staffed during market hours, Monday to Friday.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
