import type { CompanyData } from "@/lib/types";

function formatMarketCap(cap: number | null): string {
  if (cap == null) return "—";
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
  if (cap >= 1e6) return `$${(cap / 1e6).toFixed(1)}M`;
  return `$${cap.toLocaleString()}`;
}

export default function CompanyHeader({ data }: { data: CompanyData }) {
  const { identity, price } = data;
  const changeColor =
    price.dayChange != null && price.dayChange >= 0
      ? "text-success"
      : "text-danger";

  return (
    <div className="flex flex-col gap-3">
      {/* Top row: ticker + exchange */}
      <div className="flex items-center gap-3">
        <span className="font-mono text-3xl font-semibold text-text">
          {identity.ticker}
        </span>
        {identity.exchange && (
          <span className="rounded border border-border bg-surface-light px-2 py-0.5 font-mono text-xs text-text-muted">
            {identity.exchange}
          </span>
        )}
      </div>

      {/* Company name */}
      <h1 className="text-lg font-medium text-text">
        {identity.name ?? "—"}
      </h1>

      {/* Price row */}
      <div className="flex items-baseline gap-4">
        <span className="font-mono text-4xl font-semibold text-text">
          {price.current != null
            ? `${identity.currency === "INR" ? "₹" : "$"}${price.current.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : "—"}
        </span>
        {price.dayChange != null && price.dayChangePct != null && (
          <span className={`font-mono text-sm ${changeColor}`}>
            {price.dayChange >= 0 ? "+" : ""}
            {price.dayChange.toFixed(2)} ({(price.dayChangePct * 100).toFixed(2)}%)
          </span>
        )}
      </div>

      {/* Tags row */}
      <div className="flex flex-wrap items-center gap-2">
        {identity.sector && (
          <span className="rounded bg-surface-light px-2 py-0.5 text-xs text-text-muted">
            {identity.sector}
          </span>
        )}
        {identity.industry && (
          <span className="rounded bg-surface-light px-2 py-0.5 text-xs text-text-muted">
            {identity.industry}
          </span>
        )}
        <span className="font-mono text-xs text-text-muted">
          Mkt Cap {formatMarketCap(price.marketCap)}
        </span>
      </div>
    </div>
  );
}
