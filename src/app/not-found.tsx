import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="tnum text-[13px] font-semibold uppercase tracking-[0.18em] text-ink-3">Error 404</p>
      <h1 className="mt-4 text-[38px] font-bold leading-tight tracking-tight text-ink sm:text-[48px]">
        We couldn&apos;t find that page
      </h1>
      <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-2">
        The link may be out of date, or the page may have moved. Everything else is working normally.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/"
          className="inline-flex h-11 items-center rounded-full bg-inverse px-6 text-sm font-medium text-on-inverse transition-opacity hover:opacity-85"
        >
          Back to home
        </Link>
        <Link
          href="/login"
          className="inline-flex h-11 items-center rounded-full border border-line-strong px-6 text-sm font-medium text-ink transition-colors hover:bg-surface"
        >
          Go to portal
        </Link>
      </div>
    </main>
  );
}
