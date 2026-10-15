import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/app/login/login-form";
import { DashboardMock } from "@/components/features/dashboard-mock";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export const metadata: Metadata = {
  title: "Log in",
  description: "Sign in to the Meridian Capital Partners portal.",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-inverse text-[13px] font-bold text-on-inverse">
              M
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-ink">Meridian</span>
          </Link>
          <ThemeToggle />
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-14">
          <h1 className="text-[30px] font-bold leading-tight tracking-tight text-ink">Welcome back</h1>
          <p className="mt-2 text-[14.5px] text-ink-2">
            Sign in to view your balance, activity and trader updates.
          </p>
          <div className="mt-8">
            <LoginForm />
          </div>

          <div className="mt-10 rounded-xl border border-line bg-surface p-4">
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-3">
              Demo credentials
            </p>
            <ul className="mt-3 space-y-1.5 text-[12.5px] text-ink-2">
              <li>
                <span className="font-medium text-ink">Admin</span> · admin@meridiancp.com / Admin123!
              </li>
              <li>
                <span className="font-medium text-ink">Trader</span> · dana.whitfield@meridiancp.com /
                Trader123!
              </li>
              <li>
                <span className="font-medium text-ink">Client</span> · amelia.rhodes@northstarfm.com /
                Client123!
              </li>
            </ul>
          </div>
        </div>

        <p className="text-center text-[12px] text-ink-3">
          Accounts are created by Meridian. Need access?{" "}
          <Link href="/#contact" className="text-ink underline-offset-2 hover:underline">
            Contact the desk
          </Link>
          .
        </p>
      </div>

      <div className="relative hidden items-center justify-center border-l border-line bg-surface px-12 lg:flex">
        <div aria-hidden className="grid-backdrop absolute inset-0 opacity-60" />
        <div className="relative w-full max-w-md">
          <p className="mb-8 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-ink-3">
            Inside the portal
          </p>
          <DashboardMock />
          <p className="mt-10 max-w-sm text-[13.5px] leading-relaxed text-ink-2">
            Every deposit, trade outcome and withdrawal is itemised with the balance before and after, so
            there is never a figure you can&apos;t trace.
          </p>
        </div>
      </div>
    </div>
  );
}
