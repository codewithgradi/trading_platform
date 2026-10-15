"use client";

import * as React from "react";
import { motion } from "framer-motion";

import { Sparkline } from "@/components/ui/charts";
import { CountUp } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  numericValue,
  format,
  delta,
  hint,
  spark,
  sparkTone = "ink",
  tone = "default",
  index = 0,
}: {
  label: string;
  value?: string;
  numericValue?: number;
  format?: (n: number) => string;
  delta?: { value: string; positive: boolean } | null;
  hint?: string;
  spark?: number[];
  sparkTone?: "positive" | "negative" | "ink";
  tone?: "default" | "positive" | "negative" | "warning";
  index?: number;
}) {
  const valueTone =
    tone === "positive"
      ? "text-[var(--positive)]"
      : tone === "negative"
        ? "text-[var(--negative)]"
        : tone === "warning"
          ? "text-[var(--warning)]"
          : "text-ink";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.3), ease: [0.22, 1, 0.36, 1] }}
      className="rounded-xl border border-line bg-elevated p-5"
    >
      <p className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-3">{label}</p>
      <p className={cn("tnum mt-2 text-[26px] font-bold leading-none tracking-tight", valueTone)}>
        {numericValue !== undefined ? <CountUp value={numericValue} format={format} /> : value}
      </p>
      <div className="mt-2.5 flex items-center justify-between gap-3">
        <span className="text-[12px] text-ink-3">{hint}</span>
        {delta ? (
          <span
            className={cn(
              "tnum text-[12px] font-semibold",
              delta.positive ? "text-[var(--positive)]" : "text-[var(--negative)]",
            )}
          >
            {delta.value}
          </span>
        ) : null}
      </div>
      {spark && spark.length > 1 ? (
        <div className="mt-3">
          <Sparkline data={spark} tone={sparkTone} />
        </div>
      ) : null}
    </motion.div>
  );
}

export function RangeSelector({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { key: string; label: string }[];
}) {
  return (
    <div
      role="group"
      aria-label="Select date range"
      className="inline-flex rounded-full border border-line p-0.5"
    >
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          onClick={() => onChange(option.key)}
          aria-pressed={value === option.key}
          className={cn(
            "relative rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors",
            value === option.key ? "text-on-inverse" : "text-ink-2 hover:text-ink",
          )}
        >
          {value === option.key ? (
            <motion.span
              layoutId={`range-${options.map((o) => o.key).join("")}`}
              className="absolute inset-0 rounded-full bg-inverse"
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            />
          ) : null}
          <span className="relative">{option.label}</span>
        </button>
      ))}
    </div>
  );
}

export function LastUpdated({ timestamp }: { timestamp: number }) {
  const [, force] = React.useReducer((x: number) => x + 1, 0);
  React.useEffect(() => {
    const interval = setInterval(force, 15000);
    return () => clearInterval(interval);
  }, []);

  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  const text = seconds < 60 ? `${seconds}s ago` : `${Math.round(seconds / 60)}m ago`;
  return <span className="text-[11.5px] text-ink-3">Updated {text}</span>;
}
