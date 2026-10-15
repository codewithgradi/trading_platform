"use client";

import { motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

const POINTS = [18, 22, 20, 28, 26, 34, 31, 39, 44, 41, 52, 58, 55, 64, 72];

const ROWS = [
  { label: "Trade outcome · EUR/USD", amount: "+$1,284.00", positive: true, time: "09:42" },
  { label: "Deposit · Wire transfer", amount: "+$10,000.00", positive: true, time: "Yesterday" },
  { label: "Withdrawal · Processed", amount: "−$2,500.00", positive: false, time: "Mon" },
];

export function DashboardMock() {
  const width = 320;
  const height = 92;
  const max = Math.max(...POINTS);
  const min = Math.min(...POINTS);
  const path = POINTS.map((value, index) => {
    const x = (index / (POINTS.length - 1)) * width;
    const y = height - ((value - min) / (max - min)) * (height - 10) - 5;
    return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  return (
    <div className="relative">
      <div
        aria-hidden
        className="absolute -inset-6 rounded-[28px] border border-line bg-surface/50 lg:-inset-8"
      />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-2xl border border-line bg-elevated"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-inverse text-[11px] font-bold text-on-inverse">
              M
            </span>
            <span className="text-[12.5px] font-semibold text-ink">Client portal</span>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-[var(--positive)]" />
            Live
          </span>
        </div>

        <div className="px-5 pb-5 pt-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">Account balance</p>
          <div className="mt-1.5 flex items-end gap-3">
            <span className="tnum text-[32px] font-bold leading-none tracking-tight text-ink">
              $184,920.44
            </span>
            <span className="tnum mb-1 inline-flex items-center gap-1 rounded-md border border-[var(--positive)]/30 bg-[var(--positive)]/10 px-1.5 py-0.5 text-[11px] font-semibold text-[var(--positive)]">
              <ArrowUpRight className="h-3 w-3" strokeWidth={2.4} />
              12.4%
            </span>
          </div>

          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="mt-5 h-24 w-full"
            preserveAspectRatio="none"
            aria-hidden
          >
            <defs>
              <linearGradient id="mock-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--positive)" stopOpacity="0.2" />
                <stop offset="100%" stopColor="var(--positive)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <motion.path
              d={`${path} L${width},${height} L0,${height} Z`}
              fill="url(#mock-fill)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.9, delay: 0.5 }}
            />
            <motion.path
              d={path}
              fill="none"
              stroke="var(--positive)"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
            />
          </svg>

          <div className="mt-4 divide-y divide-[var(--border)] border-t border-line">
            {ROWS.map((row, index) => (
              <motion.div
                key={row.label}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.6 + index * 0.1 }}
                className="flex items-center gap-3 py-2.5"
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full border ${
                    row.positive
                      ? "border-[var(--positive)]/25 text-[var(--positive)]"
                      : "border-line text-ink-3"
                  }`}
                >
                  {row.positive ? (
                    <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} />
                  ) : (
                    <ArrowDownLeft className="h-3.5 w-3.5" strokeWidth={2} />
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink-2">{row.label}</span>
                <span
                  className={`tnum text-[12.5px] font-semibold ${
                    row.positive ? "text-[var(--positive)]" : "text-ink"
                  }`}
                >
                  {row.amount}
                </span>
                <span className="hidden w-16 text-right text-[11px] text-ink-3 sm:block">{row.time}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
