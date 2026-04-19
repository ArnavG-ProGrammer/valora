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
    <div className="glass-tooltip px-3 py-2">
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
      <div className="glass-card flex h-64 items-center justify-center">
        <p className="relative z-10 text-sm text-text-muted">Price history unavailable</p>
      </div>
    );
  }

  const tickInterval = Math.max(Math.floor(history.length / 6), 1);

  return (
    <div className="glass-card p-4">
      <p className="relative z-10 mb-3 text-xs uppercase tracking-wider text-text-muted">
        1Y Price History
      </p>
      <div className="relative z-10">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={history}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.04)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tickFormatter={formatDateShort}
              interval={tickInterval}
              tick={{ fill: "#6B6B70", fontSize: 11 }}
              axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
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
    </div>
  );
}
