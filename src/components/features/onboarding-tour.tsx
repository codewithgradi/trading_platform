"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

import { Button } from "@/components/ui/primitives";
import { completeOnboardingAction } from "@/app/actions/session";
import { cn } from "@/lib/utils";

export type TourStep = { target?: string; title: string; body: string };

export const TOURS: Record<string, TourStep[]> = {
  admin: [
    {
      title: "Welcome to the Meridian control room",
      body: "You oversee every trader, client and dollar on the platform. This 60-second tour shows where everything lives.",
    },
    {
      target: '[data-tour="nav-users"]',
      title: "People management",
      body: "Create traders and clients, assign books of business, suspend accounts and reset credentials. Every change is written to the audit log.",
    },
    {
      target: '[data-tour="nav-cms"]',
      title: "Content studio",
      body: "Edit the public website — hero, pillars, FAQs, testimonials, legal pages — then publish. Published changes revalidate the marketing site instantly.",
    },
    {
      target: '[data-tour="nav-analytics"]',
      title: "Platform analytics",
      body: "Live AUM, deposit and withdrawal flow, trader comparison and growth trends. Everything refreshes without a reload.",
    },
    {
      target: '[data-tour="nav-audit"]',
      title: "Audit trail & security",
      body: "Every financial action, content publish and credential change is recorded here with before/after values.",
    },
  ],
  trader: [
    {
      title: "Your trading desk",
      body: "Manage your assigned book, move balances, log trades and keep clients informed — all from one place.",
    },
    {
      target: '[data-tour="nav-customers"]',
      title: "Your customers",
      body: "Open any client to see their balance, full ledger, notes and feedback history before you act.",
    },
    {
      target: '[data-tour="nav-trades"]',
      title: "Trade blotter",
      body: "Log trades with instrument, direction, size and P&L, then allocate outcomes across clients proportionally or manually.",
    },
    {
      target: '[data-tour="nav-withdrawals"]',
      title: "Withdrawal queue",
      body: "Approve, reject or mark requests as processed. Approving debits the client ledger atomically and notifies them.",
    },
    {
      target: '[data-tour="nav-feedback"]',
      title: "Feedback inbox",
      body: "Reply to concerns, set priority and resolve threads. Response times feed your analytics.",
    },
  ],
  client: [
    {
      title: "Welcome to your portal",
      body: "This is where you watch your capital work. Here's a quick orientation — it takes under a minute.",
    },
    {
      target: '[data-tour="balance-card"]',
      title: "Your live balance",
      body: "Updates the moment your trader books a result, a deposit lands or a withdrawal is processed.",
    },
    {
      target: '[data-tour="nav-transactions"]',
      title: "Every movement, itemised",
      body: "Filter by type, date and status, then export to CSV for your own records. Each row shows the balance before and after.",
    },
    {
      target: '[data-tour="nav-withdrawals"]',
      title: "Requesting a withdrawal",
      body: "Submit a request and follow it through review, approval and settlement with a clear status timeline.",
    },
    {
      target: '[data-tour="notifications"]',
      title: "Stay informed",
      body: "Every balance change triggers a notification telling you what changed, by how much, and your new balance.",
    },
  ],
};

export function OnboardingTour({ role, completed }: { role: string; completed: boolean }) {
  const steps = TOURS[role] ?? [];
  const [open, setOpen] = React.useState(false);
  const [index, setIndex] = React.useState(0);
  const [rect, setRect] = React.useState<DOMRect | null>(null);

  React.useEffect(() => {
    if (!completed && steps.length) {
      const timer = setTimeout(() => setOpen(true), 650);
      return () => clearTimeout(timer);
    }
  }, [completed, steps.length]);

  React.useEffect(() => {
    const handler = () => {
      setIndex(0);
      setOpen(true);
    };
    window.addEventListener("replay-tour", handler);
    return () => window.removeEventListener("replay-tour", handler);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const target = steps[index]?.target;
    if (!target) {
      setRect(null);
      return;
    }
    const element = document.querySelector(target);
    if (!element) {
      setRect(null);
      return;
    }
    element.scrollIntoView({ block: "center", behavior: "smooth" });
    const update = () => setRect(element.getBoundingClientRect());
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, index, steps]);

  const finish = async () => {
    setOpen(false);
    await completeOnboardingAction();
  };

  if (!steps.length) return null;

  const step = steps[index];
  const isLast = index === steps.length - 1;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80]"
          role="dialog"
          aria-modal="true"
          aria-label="Product tour"
        >
          <div className="absolute inset-0 bg-black/65" onClick={() => void finish()} />

          {rect ? (
            <motion.div
              layout
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-none absolute rounded-xl border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.65)]"
              style={{
                top: rect.top - 6,
                left: rect.left - 6,
                width: rect.width + 12,
                height: rect.height + 12,
              }}
            />
          ) : null}

          <motion.div
            key={index}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "absolute left-1/2 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-line bg-elevated p-6",
              rect && rect.bottom + 230 < window.innerHeight ? "" : "top-1/2 -translate-y-1/2",
            )}
            style={rect && rect.bottom + 230 < window.innerHeight ? { top: rect.bottom + 20 } : undefined}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">
              Step {index + 1} of {steps.length}
            </p>
            <h2 className="mt-2 text-lg font-semibold tracking-tight text-ink">{step.title}</h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{step.body}</p>

            <div className="mt-5 flex items-center justify-between gap-3">
              <div className="flex gap-1.5" aria-hidden>
                {steps.map((_, dotIndex) => (
                  <span
                    key={dotIndex}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      dotIndex === index ? "w-5 bg-ink" : "w-1.5 bg-line-strong",
                    )}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void finish()}
                  className="px-2 text-[13px] font-medium text-ink-3 transition-colors hover:text-ink"
                >
                  Skip
                </button>
                {index > 0 ? (
                  <Button size="sm" variant="secondary" onClick={() => setIndex((i) => i - 1)}>
                    <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
                    Back
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  onClick={() => (isLast ? void finish() : setIndex((i) => i + 1))}
                >
                  {isLast ? "Finish" : "Next"}
                  {isLast ? (
                    <Check className="h-3.5 w-3.5" strokeWidth={2} />
                  ) : (
                    <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function ReplayTourButton({ label = "Replay guide" }: { label?: string }) {
  return (
    <Button variant="secondary" size="sm" onClick={() => window.dispatchEvent(new Event("replay-tour"))}>
      {label}
    </Button>
  );
}
