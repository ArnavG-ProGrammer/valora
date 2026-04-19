"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { HistoryPoint } from "@/lib/types";

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: HistoryPoint }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded border border-border bg-surface px-3 py-2 shadow-lg">
      <p className="text-xs text-text-muted">{point.date}</p>
      <p className="font-mono text-sm font-semibold text-text">
        ${point.close.toFixed(2)}
      </p>
    </div>
  );
}

export default function PriceChart({ history }: { history: HistoryPoint[] }) {
  if (history.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-border bg-surface">
        <p className="text-sm text-text-muted">Price history unavailable</p>
      </div>
    );
  }

  // Thin the data for x-axis labels — show ~6 ticks
  const tickInterval = Math.max(Math.floor(history.length / 6), 1);

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="mb-3 text-xs uppercase tracking-wider text-text-muted">
        1Y Price History
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={history}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#1E1E22"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tickFormatter={formatDateShort}
            interval={tickInterval}
            tick={{ fill: "#6B6B70", fontSize: 11 }}
            axisLine={{ stroke: "#1E1E22" }}
            tickLine={false}
          />
          <YAxis
            domain={["dataMin", "dataMax"]}
            tick={{ fill: "#6B6B70", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `$${v.toFixed(0)}`}
            width={55}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="close"
            stroke="#E8A87C"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3, fill: "#E8A87C", stroke: "#0A0A0B", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
