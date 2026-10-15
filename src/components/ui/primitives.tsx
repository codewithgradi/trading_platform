"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/* ------------------------------- Button -------------------------------- */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";
type ButtonSize = "sm" | "md" | "lg" | "icon";

const variantClass: Record<ButtonVariant, string> = {
  primary:
    "bg-inverse text-on-inverse hover:opacity-85 disabled:opacity-40 border border-transparent",
  secondary: "bg-transparent text-ink border border-line-strong hover:bg-surface disabled:opacity-40",
  ghost: "bg-transparent text-ink-2 hover:bg-surface hover:text-ink border border-transparent",
  danger: "bg-[var(--negative)] text-white hover:opacity-90 border border-transparent",
  success: "bg-[var(--positive)] text-black hover:opacity-90 border border-transparent",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-[13px]",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-7 text-[15px]",
  icon: "h-10 w-10",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", loading, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex select-none items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed",
        variantClass[variant],
        sizeClass[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  );
});

/* -------------------------------- Card ---------------------------------- */

export function Card({
  className,
  interactive,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-line bg-elevated",
        interactive && "transition-colors duration-200 hover:border-line-strong",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 border-b border-line px-5 py-4", className)}>
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold tracking-tight text-ink">{title}</h3>
        {description ? <p className="mt-0.5 text-[13px] text-ink-3">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/* -------------------------------- Badge --------------------------------- */

type Tone = "neutral" | "positive" | "negative" | "warning" | "info";

const toneClass: Record<Tone, string> = {
  neutral: "border-line bg-surface text-ink-2",
  positive: "border-[var(--positive)]/30 bg-[var(--positive)]/10 text-[var(--positive)]",
  negative: "border-[var(--negative)]/30 bg-[var(--negative)]/10 text-[var(--negative)]",
  warning: "border-[var(--warning)]/40 bg-[var(--warning)]/12 text-[#8a6100] dark:text-[var(--warning)]",
  info: "border-[var(--info)]/30 bg-[var(--info)]/10 text-[var(--info)]",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export const statusTone: Record<string, Tone> = {
  active: "positive",
  completed: "positive",
  approved: "positive",
  processed: "positive",
  resolved: "positive",
  published: "positive",
  open: "warning",
  pending: "warning",
  in_review: "info",
  draft: "neutral",
  suspended: "negative",
  rejected: "negative",
  closed: "neutral",
  reversed: "negative",
};

/* ------------------------------- Inputs --------------------------------- */

export const inputClass =
  "h-11 w-full rounded-lg border border-line bg-bg px-3.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-ink disabled:opacity-50";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(inputClass, className)} {...props} />;
  },
);

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(inputClass, "h-auto min-h-[110px] resize-y py-3 leading-relaxed", className)}
      {...props}
    />
  );
});

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={cn(inputClass, "cursor-pointer appearance-none pr-9", className)} {...props}>
      {children}
    </select>
  );
});

export function Field({
  label,
  hint,
  error,
  children,
  className,
  htmlFor,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-[13px] font-medium text-ink-2">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-[12px] font-medium text-[var(--negative)]">{error}</p>
      ) : hint ? (
        <p className="text-[12px] text-ink-3">{hint}</p>
      ) : null}
    </div>
  );
}

/* ------------------------------ Feedback -------------------------------- */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-lg", className)} aria-hidden />;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {icon ? (
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-ink-3">
          {icon}
        </div>
      ) : null}
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-[13px] text-ink-3">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function LiveDot({ label = "Live" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
      <span className="live-dot h-1.5 w-1.5 rounded-full bg-[var(--positive)]" />
      {label}
    </span>
  );
}

/* ------------------------------- Motion --------------------------------- */

export const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------ Count-up -------------------------------- */

export function CountUp({
  value,
  format,
  className,
  duration = 900,
}: {
  value: number;
  format?: (n: number) => string;
  className?: string;
  duration?: number;
}) {
  const [display, setDisplay] = React.useState(value);
  const fromRef = React.useRef(value);
  const frameRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    const reduce =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = fromRef.current;
    if (reduce || from === value) {
      fromRef.current = value;
      setDisplay(value);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (value - from) * eased);
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [value, duration]);

  return <span className={cn("tnum", className)}>{format ? format(display) : display.toFixed(2)}</span>;
}
