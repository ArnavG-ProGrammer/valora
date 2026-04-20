"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, ChevronDown } from "lucide-react";
import { MARKETS, DEFAULT_MARKET_ID, getMarketById } from "@/lib/markets";
import type { Market } from "@/lib/markets";

interface SearchResult {
  ticker: string;
  name: string;
  exchange: string;
}

const STORAGE_KEY = "valora-market";

function usePersistedMarket(): [Market, (m: Market) => void] {
  const [market, setMarketState] = useState<Market>(
    getMarketById(DEFAULT_MARKET_ID)
  );

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const found = MARKETS.find((m) => m.id === saved);
      if (found) setMarketState(found);
    }
  }, []);

  const setMarket = useCallback((m: Market) => {
    setMarketState(m);
    localStorage.setItem(STORAGE_KEY, m.id);
  }, []);

  return [market, setMarket];
}

export default function SearchBar() {
  const [market, setMarket] = usePersistedMarket();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [marketOpen, setMarketOpen] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const marketRef = useRef<HTMLDivElement>(null);

  // Debounced live search with market filter
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 1) {
      setResults([]);
      setNoResults(false);
      setSearching(false);
      return;
    }

    setSearching(true);
    setNoResults(false);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(trimmed)}&market=${market.id}`
        );
        const data = await res.json();
        const items: SearchResult[] = data.results || [];
        setResults(items);
        setNoResults(items.length === 0 && trimmed.length > 0);
        setIsOpen(true);
      } catch {
        setResults([]);
        setNoResults(true);
      } finally {
        setSearching(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [query, market]);

  const showDropdown =
    isOpen && (results.length > 0 || noResults || searching);

  function navigate(symbol: string) {
    setQuery("");
    setResults([]);
    setIsOpen(false);
    setError(null);
    setNoResults(false);
    router.push(`/company/${encodeURIComponent(symbol)}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = query.trim().toUpperCase();
    if (!clean) {
      setError("Enter a ticker symbol or company name");
      return;
    }
    if (highlightIdx >= 0 && highlightIdx < results.length) {
      navigate(results[highlightIdx].ticker);
      return;
    }
    if (results.length > 0) {
      navigate(results[0].ticker);
      return;
    }
    // Raw input — append suffix if applicable
    const ticker =
      market.suffix && !clean.includes(".")
        ? `${clean}${market.suffix}`
        : clean;
    if (ticker.length > 15) {
      setError("Ticker symbol too long");
      return;
    }
    setError(null);
    navigate(ticker);
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
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setMarketOpen(false);
      setHighlightIdx(-1);
    }
  }

  function handleChange(value: string) {
    setQuery(value);
    setIsOpen(true);
    setHighlightIdx(-1);
    if (error) setError(null);
  }

  function selectMarket(m: Market) {
    setMarket(m);
    setMarketOpen(false);
    setQuery("");
    setResults([]);
    setNoResults(false);
    inputRef.current?.focus();
  }

  // Suggest alternative market on empty results
  function altMarket(): Market | null {
    if (market.id === "NSE" || market.id === "BSE") {
      return getMarketById("NYSE");
    }
    return getMarketById("NSE");
  }

  // Close dropdowns on outside click
  const handleClickOutside = useCallback((e: MouseEvent) => {
    const target = e.target as Node;
    if (
      listRef.current &&
      !listRef.current.contains(target) &&
      inputRef.current &&
      !inputRef.current.contains(target)
    ) {
      setIsOpen(false);
    }
    if (marketRef.current && !marketRef.current.contains(target)) {
      setMarketOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);

  return (
    <div className="relative w-full max-w-lg">
      {/* "Searching on" label */}
      <p className="mb-2 text-center text-[11px] text-accent/50">
        Searching on {market.flag} {market.label} &middot; {market.country}
      </p>

      <form onSubmit={handleSubmit}>
        <div
          className={`glass-card flex items-center transition-colors focus-within:ring-1 ${
            error
              ? "border-danger focus-within:border-danger focus-within:ring-danger"
              : "focus-within:border-accent/40 focus-within:ring-accent/40"
          }`}
        >
          {/* Market selector pill */}
          <div ref={marketRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMarketOpen((p) => !p)}
              className="flex items-center gap-1.5 rounded-l-[18px] px-3 py-3 text-sm transition-colors hover:bg-white/[0.03]"
            >
              <span className="text-sm">{market.flag}</span>
              <span className="font-mono text-xs font-medium text-text-muted">
                {market.label}
              </span>
              <ChevronDown className="h-3 w-3 text-text-muted/50" />
            </button>

            {/* Market dropdown */}
            {marketOpen && (
              <div className="glass-dropdown absolute left-0 top-full z-30 mt-2 w-56 overflow-hidden">
                {MARKETS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => selectMarket(m)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      m.id === market.id
                        ? "bg-white/5"
                        : "hover:bg-white/[0.03]"
                    }`}
                  >
                    <span className="text-sm">{m.flag}</span>
                    <span className="font-mono text-xs font-medium text-text">
                      {m.label}
                    </span>
                    <span className="flex-1 truncate text-[11px] text-text-muted/50">
                      {m.country}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Separator */}
          <div className="h-6 w-px shrink-0 bg-white/[0.08]" />

          {/* Search input */}
          <div className="flex flex-1 items-center gap-2 px-3 py-3">
            {searching ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-accent" />
            ) : (
              <Search className="h-4 w-4 shrink-0 text-text-muted" />
            )}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsOpen(true)}
              placeholder={`Search companies on ${market.label}...`}
              className="w-full bg-transparent font-mono text-sm text-text placeholder:text-text-muted outline-none"
              autoFocus
            />
          </div>
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
          {searching && results.length === 0 && (
            <div className="px-4 py-3">
              <p className="text-xs text-accent/70">Searching {market.label}...</p>
            </div>
          )}

          {results.map((item, i) => (
            <button
              key={item.ticker}
              onClick={() => navigate(item.ticker)}
              onMouseEnter={() => setHighlightIdx(i)}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                i === highlightIdx ? "bg-white/5" : "hover:bg-white/[0.03]"
              }`}
            >
              <span className="font-mono text-sm font-medium text-accent">
                {item.ticker}
              </span>
              <span className="flex-1 truncate text-sm text-text-muted">
                {item.name}
              </span>
              <span className="text-[10px] text-text-muted/50">
                {item.exchange}
              </span>
            </button>
          ))}

          {noResults && !searching && (
            <div className="px-4 py-3">
              <p className="text-xs text-text-muted">
                No matches for &ldquo;{query.trim()}&rdquo; on {market.label}.
                Try a different spelling or check the ticker.
              </p>
              {altMarket() && (
                <button
                  type="button"
                  onClick={() => selectMarket(altMarket()!)}
                  className="mt-2 text-xs text-accent/70 transition-colors hover:text-accent"
                >
                  Switch to {altMarket()!.flag} {altMarket()!.label}
                </button>
              )}
            </div>
          )}

          {!searching && results.length > 0 && (
            <div className="border-t border-white/[0.04] px-4 py-1.5">
              <p className="text-[10px] text-text-muted/40">
                {results.length} match{results.length !== 1 ? "es" : ""} on{" "}
                {market.label}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Trending chips */}
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {["AAPL", "NVDA", "RELIANCE.NS", "TSLA", "TCS.NS", "META"].map(
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
