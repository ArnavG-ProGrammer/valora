import type { CompanyData, AnalysisResult } from "@/lib/types";

function fmt(val: number | null, opts?: { pct?: boolean; prefix?: string; suffix?: string }): string {
  if (val == null) return "—";
  const { pct, prefix = "", suffix = "" } = opts ?? {};
  if (pct) return `${prefix}${(val * 100).toFixed(1)}%${suffix}`;
  return `${prefix}${val.toFixed(2)}${suffix}`;
}

function fmtLarge(val: number | null): string {
  if (val == null) return "—";
  if (Math.abs(val) >= 1e12) return `$${(val / 1e12).toFixed(1)}T`;
  if (Math.abs(val) >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (Math.abs(val) >= 1e6) return `$${(val / 1e6).toFixed(0)}M`;
  return `$${val.toLocaleString()}`;
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  const isMissing = value === "—";
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-xs uppercase tracking-wider text-text-muted">{label}</p>
      <p
        className={`mt-1 font-mono text-xl font-semibold ${isMissing ? "text-text-muted" : "text-text"}`}
      >
        {value}
      </p>
      {sub != null && (
        <p className="mt-0.5 font-mono text-xs text-text-muted">{sub}</p>
      )}
    </div>
  );
}

export default function FinancialSnapshot({
  data,
  analysis,
}: {
  data: CompanyData;
  analysis: AnalysisResult;
}) {
  const revGrowthSub =
    data.growth.revenueGrowthYoY != null
      ? `${data.growth.revenueGrowthYoY >= 0 ? "+" : ""}${(data.growth.revenueGrowthYoY * 100).toFixed(1)}% YoY`
      : undefined;

  const roeSub =
    data.profitability.returnOnEquity != null
      ? `ROE ${(data.profitability.returnOnEquity * 100).toFixed(1)}%`
      : undefined;

  const pegSub =
    data.valuation.pegRatio != null
      ? `PEG ${data.valuation.pegRatio.toFixed(2)}`
      : undefined;

  const crSub =
    data.balance.currentRatio != null
      ? `Current Ratio ${data.balance.currentRatio.toFixed(2)}`
      : undefined;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        label="Revenue (TTM)"
        value={fmtLarge(data.growth.revenueTTM)}
        sub={revGrowthSub}
      />
      <StatCard
        label="Profit Margin"
        value={fmt(data.profitability.profitMargin, { pct: true })}
        sub={roeSub}
      />
      <StatCard
        label="P/E Ratio"
        value={
          data.valuation.peRatio != null
            ? data.valuation.peRatio.toFixed(1)
            : "—"
        }
        sub={pegSub}
      />
      <StatCard
        label="Debt / Equity"
        value={
          data.balance.debtToEquity != null
            ? (data.balance.debtToEquity / 100).toFixed(2) + "x"
            : "—"
        }
        sub={crSub}
      />
    </div>
  );
}
