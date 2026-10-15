import type { Metadata } from "next";
import Link from "next/link";

import { ContactForm } from "@/components/features/contact-form";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export const metadata: Metadata = {
  title: "Reset your password",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-5 py-6 sm:px-8">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-inverse text-[13px] font-bold text-on-inverse">
            M
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-ink">Meridian</span>
        </Link>
        <ThemeToggle />
      </div>

      <div className="flex-1 py-14">
        <h1 className="text-[30px] font-bold leading-tight tracking-tight text-ink">Reset your password</h1>
        <p className="mt-3 max-w-md text-[14.5px] leading-relaxed text-ink-2">
          For security, Meridian resets portal credentials manually. Send us a request and your
          administrator will issue a temporary password within one business day.
        </p>

        <div className="mt-8 rounded-xl border border-line p-6">
          <ContactForm />
        </div>

        <p className="mt-8 text-[13px] text-ink-2">
          Remembered it?{" "}
          <Link href="/login" className="text-ink underline-offset-2 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
