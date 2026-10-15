import Link from "next/link";
import type { ReactNode } from "react";

import { PublicHeader } from "@/components/features/public-chrome";
import { getCurrentUser } from "@/lib/auth";
import { getCmsBundle } from "@/lib/cms";
import { HOME_FOR_ROLE, type Role } from "@/lib/session";

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const [cms, user] = await Promise.all([getCmsBundle("published"), getCurrentUser()]);
  const settings = cms.settings;
  const wordmark = settings?.wordmark ?? "Meridian";
  const year = new Date().getFullYear();

  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader wordmark={wordmark} signedIn={user ? HOME_FOR_ROLE[user.role as Role] : null} />
      <div className="flex-1">{children}</div>

      <footer className="border-t border-line">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-inverse text-[13px] font-bold text-on-inverse">
                  {wordmark.charAt(0)}
                </span>
                <span className="text-[15px] font-semibold tracking-tight text-ink">
                  {settings?.companyName ?? "Meridian Capital Partners"}
                </span>
              </div>
              <p className="mt-4 max-w-sm text-[13.5px] leading-relaxed text-ink-2">
                {settings?.tagline ??
                  "A managed trading firm built on disciplined execution and complete client transparency."}
              </p>
              <dl className="mt-6 space-y-1 text-[13px] text-ink-2">
                {settings?.email ? (
                  <div>
                    <dt className="sr-only">Email</dt>
                    <dd>
                      <a className="hover:text-ink" href={`mailto:${settings.email}`}>
                        {settings.email}
                      </a>
                    </dd>
                  </div>
                ) : null}
                {settings?.phone ? (
                  <div>
                    <dt className="sr-only">Phone</dt>
                    <dd>{settings.phone}</dd>
                  </div>
                ) : null}
                {settings?.addressLine ? (
                  <div>
                    <dt className="sr-only">Address</dt>
                    <dd className="text-ink-3">{settings.addressLine}</dd>
                  </div>
                ) : null}
              </dl>
            </div>

            <nav aria-label="Company">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">Company</p>
              <ul className="mt-4 space-y-2.5 text-[13.5px] text-ink-2">
                <li>
                  <Link className="hover:text-ink" href="/#what-we-do">
                    What we do
                  </Link>
                </li>
                <li>
                  <Link className="hover:text-ink" href="/#how-it-works">
                    How it works
                  </Link>
                </li>
                <li>
                  <Link className="hover:text-ink" href="/#performance">
                    Performance
                  </Link>
                </li>
                <li>
                  <Link className="hover:text-ink" href="/#contact">
                    Contact
                  </Link>
                </li>
              </ul>
            </nav>

            <nav aria-label="Legal">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">Legal</p>
              <ul className="mt-4 space-y-2.5 text-[13.5px] text-ink-2">
                {cms.legal.map((page) => (
                  <li key={page.id}>
                    <Link className="hover:text-ink" href={`/legal/${page.slug}`}>
                      {page.title}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link className="hover:text-ink" href="/login">
                    Client log in
                  </Link>
                </li>
              </ul>
            </nav>
          </div>

          <div className="mt-12 border-t border-line pt-6">
            <p className="text-[12px] leading-relaxed text-ink-3">
              {settings?.riskDisclosure ??
                "Trading involves substantial risk of loss and is not suitable for every investor. Past performance is not a guarantee of future results."}
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[12.5px] text-ink-3">
                © {year} {settings?.companyName ?? "Meridian Capital Partners"}. All rights reserved.
              </p>
              <div className="flex gap-4 text-[12.5px] text-ink-2">
                {settings?.linkedinUrl ? (
                  <a className="hover:text-ink" href={settings.linkedinUrl} rel="noreferrer noopener">
                    LinkedIn
                  </a>
                ) : null}
                {settings?.xUrl ? (
                  <a className="hover:text-ink" href={settings.xUrl} rel="noreferrer noopener">
                    X
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
