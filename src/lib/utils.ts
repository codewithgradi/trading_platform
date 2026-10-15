import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency = "USD", maximumFractionDigits = 2) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: maximumFractionDigits,
    maximumFractionDigits,
  }).format(value);
}

export function formatCompact(value: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function formatSigned(value: number, currency = "USD") {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${formatCurrency(Math.abs(value), currency)}`;
}

export function formatPercent(value: number, digits = 1) {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(digits)}%`;
}

export function formatDate(value: Date | string | null | undefined, withTime = false) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(date);
}

export function timeAgo(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(date);
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => {
    const str = value === null || value === undefined ? "" : String(value);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  return [headers.join(","), ...rows.map((row) => headers.map((h) => escape(row[h])).join(","))].join("\n");
}

/** Minimal allow-list sanitiser for CMS rich text (no third-party runtime). */
export function sanitizeHtml(input: string): string {
  return input
    .replace(/<\s*(script|style|iframe|object|embed|link|meta)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|style|iframe|object|embed|link|meta)[^>]*\/?>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
}

export const roleLabel: Record<string, string> = {
  admin: "Administrator",
  trader: "Trader",
  client: "Client",
};

export const transactionLabel: Record<string, string> = {
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  trade_outcome: "Trade outcome",
  adjustment: "Adjustment",
};
