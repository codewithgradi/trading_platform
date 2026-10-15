"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error("Unhandled application error", error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="tnum text-[13px] font-semibold uppercase tracking-[0.18em] text-ink-3">Error 500</p>
      <h1 className="mt-4 text-[34px] font-bold leading-tight tracking-tight text-ink sm:text-[44px]">
        Something went wrong on our side
      </h1>
      <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-2">
        Your data is safe. Try again — if the problem persists, contact the desk and quote the time of the
        error.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 inline-flex h-11 items-center rounded-full bg-inverse px-6 text-sm font-medium text-on-inverse transition-opacity hover:opacity-85"
      >
        Try again
      </button>
    </main>
  );
}
