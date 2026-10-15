"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";

import { Button, Input } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export type ConfirmSummaryRow = { label: string; before?: string; after?: string; value?: string };

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  summary,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "default",
  requireWord,
  pending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  summary?: ConfirmSummaryRow[];
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  requireWord?: string;
  pending?: boolean;
  onConfirm: () => void | Promise<void>;
}) {
  const [typed, setTyped] = React.useState("");

  React.useEffect(() => {
    if (!open) setTyped("");
  }, [open]);

  const blocked = Boolean(requireWord) && typed.trim().toUpperCase() !== requireWord?.toUpperCase();

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="fixed inset-0 z-[90] bg-black/55 backdrop-blur-[2px]"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount>
              <motion.div
                initial={{ opacity: 0, scale: 0.97, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 8 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="fixed left-1/2 top-1/2 z-[95] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line bg-elevated p-6 shadow-2xl"
              >
                <div className="flex items-start gap-3">
                  {tone === "danger" ? (
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--negative)]/12 text-[var(--negative)]">
                      <AlertTriangle className="h-4 w-4" strokeWidth={2} />
                    </span>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <Dialog.Title className="text-lg font-semibold tracking-tight text-ink">
                      {title}
                    </Dialog.Title>
                    {description ? (
                      <Dialog.Description className="mt-1.5 text-[13px] leading-relaxed text-ink-2">
                        {description}
                      </Dialog.Description>
                    ) : null}
                  </div>
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      aria-label="Close dialog"
                      className="rounded-md p-1.5 text-ink-3 transition-colors hover:bg-surface hover:text-ink"
                    >
                      <X className="h-4 w-4" strokeWidth={2} />
                    </button>
                  </Dialog.Close>
                </div>

                {summary?.length ? (
                  <dl className="mt-5 divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-line bg-surface">
                    {summary.map((row) => (
                      <div key={row.label} className="flex items-center justify-between gap-4 px-4 py-2.5">
                        <dt className="text-[12px] font-medium uppercase tracking-wide text-ink-3">
                          {row.label}
                        </dt>
                        <dd className="tnum text-right text-[13px] font-semibold text-ink">
                          {row.value ?? (
                            <span className="inline-flex items-center gap-2">
                              <span className="text-ink-3 line-through">{row.before}</span>
                              <span aria-hidden>→</span>
                              <span>{row.after}</span>
                            </span>
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : null}

                {requireWord ? (
                  <div className="mt-5 space-y-1.5">
                    <label htmlFor="confirm-word" className="block text-[13px] font-medium text-ink-2">
                      Type <span className="font-semibold text-ink">{requireWord}</span> to confirm
                    </label>
                    <Input
                      id="confirm-word"
                      value={typed}
                      autoComplete="off"
                      onChange={(event) => setTyped(event.target.value)}
                      placeholder={requireWord}
                    />
                  </div>
                ) : null}

                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Dialog.Close asChild>
                    <Button type="button" variant="secondary">
                      {cancelLabel}
                    </Button>
                  </Dialog.Close>
                  <Button
                    type="button"
                    variant={tone === "danger" ? "danger" : "primary"}
                    disabled={blocked}
                    loading={pending}
                    onClick={() => void onConfirm()}
                    className={cn(blocked && "opacity-40")}
                  >
                    {confirmLabel}
                  </Button>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  );
}
