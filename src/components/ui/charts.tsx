"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { cn, formatCompact, formatCurrency } from "@/lib/utils";

function useChartTheme() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";
  return {
    ink: dark ? "#FFFFFF" : "#000000",
    axis: dark ? "#8A8A8A" : "#757575",
    grid: dark ? "#2E2E2E" : "#E2E2E2",
    surface: dark ? "#1F1F1F" : "#FFFFFF",
    positive: dark ? "#1FD37F" : "#06C167",
    negative: dark ? "#FF5247" : "#E11900",
    warning: "#FFC043",
    info: dark ? "#5B91F5" : "#276EF1",
  };
}

type TooltipEntry = { name?: string; value?: number | string; color?: string; dataKey?: string | number };

function ChartTooltip({
  active,
  payload,
  label,
  valueFormatter,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  valueFormatter?: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-elevated px-3 py-2 text-[12px] shadow-lg">
      {label !== undefined ? <p className="mb-1 font-semibold text-ink">{label}</p> : null}
      {payload.map((entry, index) => (
        <p key={index} className="flex items-center gap-2 text-ink-2">
          <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
          <span>{entry.name}</span>
          <span className="tnum ml-auto font-semibold text-ink">
            {valueFormatter ? valueFormatter(Number(entry.value)) : String(entry.value)}
          </span>
        </p>
      ))}
    </div>
  );
}

export function ChartCard({
  title,
  description,
  action,
  children,
  className,
  footnote,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  footnote?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-line bg-elevated", className)}>
      <header className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-[15px] font-semibold tracking-tight text-ink">{title}</h3>
          {description ? <p className="mt-0.5 text-[13px] text-ink-3">{description}</p> : null}
        </div>
        {action}
      </header>
      <div className="px-2 py-4 sm:px-4">{children}</div>
      {footnote ? <p className="border-t border-line px-5 py-2.5 text-[12px] text-ink-3">{footnote}</p> : null}
    </section>
  );
}

export function AreaTrend({
  data,
  dataKey = "value",
  xKey = "label",
  height = 260,
  currency = true,
  ariaLabel,
}: {
  data: Array<Record<string, string | number>>;
  dataKey?: string;
  xKey?: string;
  height?: number;
  currency?: boolean;
  ariaLabel?: string;
}) {
  const theme = useChartTheme();
  const positive = data.length > 1 ? Number(data[data.length - 1][dataKey]) >= Number(data[0][dataKey]) : true;
  const stroke = positive ? theme.positive : theme.negative;
  const format = (value: number) => (currency ? formatCurrency(value) : value.toLocaleString());

  return (
    <div role="img" aria-label={ariaLabel ?? "Trend chart"} style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id={`fill-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.22} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={theme.grid} strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey={xKey}
            tickLine={false}
            axisLine={false}
            tick={{ fill: theme.axis, fontSize: 11 }}
            minTickGap={24}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={56}
            tick={{ fill: theme.axis, fontSize: 11 }}
            tickFormatter={(value: number) => (currency ? `$${formatCompact(value)}` : formatCompact(value))}
          />
          <Tooltip content={<ChartTooltip valueFormatter={format} />} cursor={{ stroke: theme.grid }} />
          <Area
            type="monotone"
            dataKey={dataKey}
            name="Balance"
            stroke={stroke}
            strokeWidth={2}
            fill={`url(#fill-${dataKey})`}
            animationDuration={900}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GroupedBars({
  data,
  series,
  xKey = "label",
  height = 260,
  ariaLabel,
}: {
  data: Array<Record<string, string | number>>;
  series: Array<{ key: string; name: string; tone: "positive" | "negative" | "ink" | "info" }>;
  xKey?: string;
  height?: number;
  ariaLabel?: string;
}) {
  const theme = useChartTheme();
  const colorFor = (tone: string) =>
    tone === "positive" ? theme.positive : tone === "negative" ? theme.negative : tone === "info" ? theme.info : theme.ink;

  return (
    <div role="img" aria-label={ariaLabel ?? "Bar chart"} style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 4 }} barGap={2}>
          <CartesianGrid stroke={theme.grid} strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey={xKey} tickLine={false} axisLine={false} tick={{ fill: theme.axis, fontSize: 11 }} minTickGap={16} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={48}
            tick={{ fill: theme.axis, fontSize: 11 }}
            tickFormatter={(value: number) => formatCompact(value)}
          />
          <Tooltip
            content={<ChartTooltip valueFormatter={(value) => value.toLocaleString()} />}
            cursor={{ fill: theme.grid, opacity: 0.35 }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            height={28}
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, color: theme.axis }}
          />
          {series.map((item) => (
            <Bar
              key={item.key}
              dataKey={item.key}
              name={item.name}
              fill={colorFor(item.tone)}
              radius={[3, 3, 0, 0]}
              animationDuration={800}
              maxBarSize={26}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DonutBreakdown({
  data,
  height = 260,
  valueFormatter,
  ariaLabel,
}: {
  data: Array<{ name: string; value: number; tone?: "positive" | "negative" | "warning" | "info" | "ink" }>;
  height?: number;
  valueFormatter?: (value: number) => string;
  ariaLabel?: string;
}) {
  const theme = useChartTheme();
  const palette = (tone?: string) => {
    switch (tone) {
      case "positive":
        return theme.positive;
      case "negative":
        return theme.negative;
      case "warning":
        return theme.warning;
      case "info":
        return theme.info;
      default:
        return theme.ink;
    }
  };
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (!total) {
    return (
      <div className="flex h-[200px] items-center justify-center text-[13px] text-ink-3">
        No data for this period yet.
      </div>
    );
  }

  return (
    <div role="img" aria-label={ariaLabel ?? "Distribution chart"} style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="58%"
            outerRadius="82%"
            paddingAngle={2}
            stroke={theme.surface}
            strokeWidth={2}
            animationDuration={800}
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={palette(entry.tone)} opacity={entry.tone ? 1 : 0.55 + index * 0.15} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip valueFormatter={valueFormatter ?? ((v) => v.toLocaleString())} />} />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, color: theme.axis }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Sparkline({ data, tone = "ink" }: { data: number[]; tone?: "positive" | "negative" | "ink" }) {
  const theme = useChartTheme();
  const color = tone === "positive" ? theme.positive : tone === "negative" ? theme.negative : theme.ink;
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data
    .map((value, index) => `${(index / (data.length - 1)) * 100},${28 - ((value - min) / range) * 26}`)
    .join(" ");

  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-7 w-full" aria-hidden>
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
