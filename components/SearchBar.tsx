"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

// ── Ticker universe for autocomplete ──────────────────────────
const TICKERS = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft Corporation" },
  { symbol: "NVDA", name: "NVIDIA Corporation" },
  { symbol: "GOOGL", name: "Alphabet Inc." },
  { symbol: "AMZN", name: "Amazon.com Inc." },
  { symbol: "META", name: "Meta Platforms Inc." },
  { symbol: "TSLA", name: "Tesla Inc." },
  { symbol: "BRK-B", name: "Berkshire Hathaway Inc." },
  { symbol: "JPM", name: "JPMorgan Chase & Co." },
  { symbol: "V", name: "Visa Inc." },
  { symbol: "JNJ", name: "Johnson & Johnson" },
  { symbol: "WMT", name: "Walmart Inc." },
  { symbol: "PG", name: "Procter & Gamble Co." },
  { symbol: "MA", name: "Mastercard Inc." },
  { symbol: "UNH", name: "UnitedHealth Group Inc." },
  { symbol: "HD", name: "Home Depot Inc." },
  { symbol: "DIS", name: "Walt Disney Co." },
  { symbol: "NFLX", name: "Netflix Inc." },
  { symbol: "ADBE", name: "Adobe Inc." },
  { symbol: "CRM", name: "Salesforce Inc." },
  { symbol: "AMD", name: "Advanced Micro Devices Inc." },
  { symbol: "INTC", name: "Intel Corporation" },
  { symbol: "PYPL", name: "PayPal Holdings Inc." },
  { symbol: "CSCO", name: "Cisco Systems Inc." },
  { symbol: "PEP", name: "PepsiCo Inc." },
  { symbol: "KO", name: "Coca-Cola Co." },
  { symbol: "COST", name: "Costco Wholesale Corp." },
  { symbol: "AVGO", name: "Broadcom Inc." },
  { symbol: "TMO", name: "Thermo Fisher Scientific" },
  { symbol: "MRK", name: "Merck & Co. Inc." },
  { symbol: "ABT", name: "Abbott Laboratories" },
  { symbol: "NKE", name: "Nike Inc." },
  { symbol: "ORCL", name: "Oracle Corporation" },
  { symbol: "ACN", name: "Accenture plc" },
  { symbol: "BA", name: "Boeing Co." },
  { symbol: "RELIANCE.NS", name: "Reliance Industries Ltd." },
  { symbol: "TCS.NS", name: "Tata Consultancy Services" },
  { symbol: "INFY.NS", name: "Infosys Ltd." },
  { symbol: "HDFCBANK.NS", name: "HDFC Bank Ltd." },
  { symbol: "ITC.NS", name: "ITC Ltd." },
  { symbol: "ZOMATO.NS", name: "Zomato Ltd." },
  { symbol: "WIPRO.NS", name: "Wipro Ltd." },
  { symbol: "TATAMOTORS.NS", name: "Tata Motors Ltd." },
  { symbol: "SBIN.NS", name: "State Bank of India" },
  { symbol: "BAJFINANCE.NS", name: "Bajaj Finance Ltd." },
];

function fuzzyMatch(query: string, symbol: string, name: string): boolean {
  const combined = `${symbol} ${name}`.toLowerCase();
  const words = query.toLowerCase().trim().split(/\s+/);
  return words.every((word) => combined.includes(word));
}

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter results based on fuzzy multi-word matching
  const results =
    query.trim().length > 0
      ? TICKERS.filter((t) => fuzzyMatch(query, t.symbol, t.name)).slice(0, 8)
      : [];

  const showDropdown = isOpen && results.length > 0;

  function navigate(symbol: string) {
    setQuery("");
    setIsOpen(false);
    setError(null);
    router.push(`/company/${encodeURIComponent(symbol)}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = query.trim().toUpperCase();
    if (!clean) {
      setError("Enter a ticker symbol or company name");
      return;
    }
    // If there's a highlighted result, use that
    if (highlightIdx >= 0 && highlightIdx < results.length) {
      navigate(results[highlightIdx].symbol);
      return;
    }
    // If the query matches a known ticker exactly, use it
    const exact = TICKERS.find(
      (t) => t.symbol.toUpperCase() === clean
    );
    if (exact) {
      navigate(exact.symbol);
      return;
    }
    // If there's exactly one result, use it
    if (results.length === 1) {
      navigate(results[0].symbol);
      return;
    }
    // Otherwise treat the raw input as a ticker symbol
    if (clean.length > 10) {
      setError("Ticker symbol must be 10 characters or less");
      return;
    }
    setError(null);
    navigate(clean);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((prev) =>
        prev < results.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((prev) =>
        prev > 0 ? prev - 1 : results.length - 1
      );
    } else if (e.key === "Enter") {
      // Let form submit handle it
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setHighlightIdx(-1);
    }
    // All other keys including Space — do nothing, let default input behavior run
  }

  function handleChange(value: string) {
    setQuery(value);
    setIsOpen(true);
    setHighlightIdx(-1);
    if (error) setError(null);
  }

  // Close dropdown on outside click
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (
      listRef.current &&
      !listRef.current.contains(e.target as Node) &&
      inputRef.current &&
      !inputRef.current.contains(e.target as Node)
    ) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);

  return (
    <div className="relative w-full max-w-lg">
      <form onSubmit={handleSubmit}>
        <div
          className={`glass-card flex items-center gap-3 px-4 py-3 transition-colors focus-within:ring-1 ${
            error
              ? "border-danger focus-within:border-danger focus-within:ring-danger"
              : "focus-within:border-accent/40 focus-within:ring-accent/40"
          }`}
        >
          <Search className="h-4 w-4 shrink-0 text-text-muted" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsOpen(true)}
            placeholder="Search ticker or company name..."
            className="w-full bg-transparent font-mono text-sm text-text placeholder:text-text-muted outline-none"
            autoFocus
          />
        </div>
        {error && (
          <p className="mt-1.5 text-xs text-danger">{error}</p>
        )}
      </form>

      {/* Autocomplete dropdown */}
      {showDropdown && (
        <div
          ref={listRef}
          className="glass-dropdown absolute left-0 right-0 z-20 mt-2 overflow-hidden"
        >
          {results.map((item, i) => (
            <button
              key={item.symbol}
              onClick={() => navigate(item.symbol)}
              onMouseEnter={() => setHighlightIdx(i)}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                i === highlightIdx
                  ? "bg-white/5"
                  : "hover:bg-white/[0.03]"
              }`}
            >
              <span className="font-mono text-sm font-medium text-accent">
                {item.symbol}
              </span>
              <span className="truncate text-sm text-text-muted">
                {item.name}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Quick-access chips */}
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {["AAPL", "MSFT", "NVDA", "RELIANCE.NS", "TCS.NS", "ZOMATO.NS"].map(
          (sym) => (
            <button
              key={sym}
              onClick={() => navigate(sym)}
              className="glass-pill font-mono text-xs text-text-muted transition-all hover:border-accent/30 hover:text-accent hover:-translate-y-px"
            >
              {sym}
            </button>
          )
        )}
      </div>
    </div>
  );
}
