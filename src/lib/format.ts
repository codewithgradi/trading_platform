const zarFormatter = new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const compactFormatter = new Intl.NumberFormat("en-ZA", { notation: "compact", maximumFractionDigits: 1 });
const dateFormatter = new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Johannesburg" });
const dateTimeFormatter = new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Johannesburg" });

export function formatCurrency(value: string | number | null | undefined) {
  return zarFormatter.format(Number(value || 0));
}
export function formatCompactCurrency(value: string | number | null | undefined) {
  // Keep the currency symbol delegated to Intl, never assembled by hand.
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", notation: "compact", maximumFractionDigits: 1 }).format(Number(value || 0));
}
export function formatNumber(value: string | number | null | undefined) {
  return new Intl.NumberFormat("en-ZA").format(Number(value || 0));
}
export function formatCompactNumber(value: string | number | null | undefined) {
  return compactFormatter.format(Number(value || 0));
}
export function formatDate(value: string | Date | null | undefined, withTime = false) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : (withTime ? dateTimeFormatter : dateFormatter).format(date);
}
export function formatPercent(value: number, digits = 1) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}%`;
}
export function formatNotificationBody(item: { body: string; data?: Record<string, unknown> | null }) {
  const details = item.data;
  if (!details || details.before == null || details.after == null || item.body.includes("Previous balance")) return item.body;
  const amount = details.amount == null ? "" : ` Change: ${formatCurrency(details.amount as string | number)}.`;
  return `${item.body}${amount} Previous balance ${formatCurrency(details.before as string | number)}; new balance ${formatCurrency(details.after as string | number)}.`;
}
export function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join("");
}
