"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

const TICKER_PATTERN = /^[A-Z0-9][A-Z0-9.\-]{0,9}$/;

export default function SearchBar() {
  const [ticker, setTicker] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function validate(value: string): string | null {
    if (!value) return "Enter a ticker symbol";
    if (!TICKER_PATTERN.test(value))
      return "Ticker can only contain letters, numbers, dots, and hyphens";
    return null;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = ticker.trim().toUpperCase();
    const err = validate(clean);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    router.push(`/company/${encodeURIComponent(clean)}`);
  }

  function handleChange(value: string) {
    const upper = value.toUpperCase().replace(/\s/g, "");
    setTicker(upper);
    if (error) setError(null);
  }

  function prefill(symbol: string) {
    setTicker(symbol);
    setError(null);
    router.push(`/company/${encodeURIComponent(symbol)}`);
  }

  return (
    <div className="w-full max-w-lg">
      <form onSubmit={handleSubmit}>
        <div
          className={`flex items-center gap-3 rounded-lg border bg-surface px-4 py-3 transition-colors focus-within:ring-1 ${
            error
              ? "border-danger focus-within:border-danger focus-within:ring-danger"
              : "border-border focus-within:border-accent focus-within:ring-accent"
          }`}
        >
          <Search className="h-4 w-4 shrink-0 text-text-muted" />
          <input
            type="text"
            value={ticker}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Enter ticker (AAPL, RELIANCE.NS, TSLA)"
            className="w-full bg-transparent font-mono text-sm text-text placeholder:text-text-muted outline-none"
            maxLength={10}
            autoFocus
          />
        </div>
        {error && (
          <p className="mt-1.5 text-xs text-danger">{error}</p>
        )}
      </form>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {["AAPL", "MSFT", "NVDA", "RELIANCE.NS", "TCS.NS", "ZOMATO.NS"].map(
          (sym) => (
            <button
              key={sym}
              onClick={() => prefill(sym)}
              className="rounded-md border border-border bg-surface-light px-3 py-1 font-mono text-xs text-text-muted transition-colors hover:border-accent hover:text-accent"
            >
              {sym}
            </button>
          )
        )}
      </div>
    </div>
  );
}
