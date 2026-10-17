"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/format";

function AnimatedValue({ value, currency }: { value: number; currency: boolean }) {
  const [display, setDisplay] = useState(value);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => { const t = Math.min(1, (now - start) / 800); const eased = 1 - Math.pow(1 - t, 3); setDisplay(value * eased); if (t < 1) frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reduced]);
  return <span className="numeric">{currency ? formatCurrency(display) : formatNumber(Math.round(display))}</span>;
}
export function StatCard({ label, value, icon, currency = true, note, positive }: { label: string; value: number; icon: ReactNode; currency?: boolean; note?: string; positive?: boolean }) {
  return <div className="stat-card"><div className="stat-card-top"><span className="stat-icon">{icon}</span><span className="stat-sparkline" aria-hidden="true"><svg viewBox="0 0 70 27"><path d="M1 23 L12 19 L19 21 L28 11 L37 15 L46 7 L54 11 L69 2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></span></div><span className="stat-label">{label}</span><strong className="stat-value"><AnimatedValue value={value} currency={currency} /></strong>{note && <span className={`stat-note ${positive === true ? "good" : positive === false ? "bad" : ""}`}>{positive === true ? <ArrowUpRight size={13} /> : positive === false ? <ArrowDownRight size={13} /> : null}{note}</span>}</div>;
}
