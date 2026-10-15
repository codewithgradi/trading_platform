"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";

type ToastTone = "success" | "error" | "info" | "warning";

type Toast = { id: string; title: string; description?: string; tone: ToastTone };

type ToastContextValue = {
  toast: (input: { title: string; description?: string; tone?: ToastTone }) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

const icons: Record<ToastTone, React.ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4 text-[var(--positive)]" strokeWidth={2} />,
  error: <XCircle className="h-4 w-4 text-[var(--negative)]" strokeWidth={2} />,
  warning: <AlertTriangle className="h-4 w-4 text-[var(--warning)]" strokeWidth={2} />,
  info: <Info className="h-4 w-4 text-ink-2" strokeWidth={2} />,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback<ToastContextValue["toast"]>(
    ({ title, description, tone = "info" }) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((current) => [...current, { id, title, description, tone }].slice(-4));
      setTimeout(() => dismiss(id), 5200);
    },
    [dismiss],
  );

  const value = React.useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:inset-auto sm:right-0 sm:top-0 sm:items-end"
      >
        <AnimatePresence initial={false}>
          {toasts.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.97 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-line bg-elevated px-4 py-3"
            >
              <span className="mt-0.5">{icons[item.tone]}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-ink">{item.title}</p>
                {item.description ? (
                  <p className="mt-0.5 text-[12px] leading-relaxed text-ink-2">{item.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                aria-label="Dismiss notification"
                className="rounded-md p-1 text-ink-3 transition-colors hover:bg-surface hover:text-ink"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
