"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";

interface SearchResult {
  ticker: string;
  name: string;
  exchange: string;
  flag: string;
}

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Debounced live search
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
          `/api/search?q=${encodeURIComponent(trimmed)}`
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
  }, [query]);

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
    if (results.length === 1) {
      navigate(results[0].ticker);
      return;
    }
    if (results.length > 0) {
      navigate(results[0].ticker);
      return;
    }
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
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setHighlightIdx(-1);
    }
  }

  function handleChange(value: string) {
    setQuery(value);
    setIsOpen(true);
    setHighlightIdx(-1);
    if (error) setError(null);
  }

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
          {/* Loading state */}
          {searching && results.length === 0 && (
            <div className="px-4 py-3">
              <p className="text-xs text-accent/70">Searching...</p>
            </div>
          )}

          {/* Results */}
          {results.map((item, i) => (
            <button
              key={item.ticker}
              onClick={() => navigate(item.ticker)}
              onMouseEnter={() => setHighlightIdx(i)}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                i === highlightIdx
                  ? "bg-white/5"
                  : "hover:bg-white/[0.03]"
              }`}
            >
              <span className="text-sm">{item.flag}</span>
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

          {/* No results */}
          {noResults && !searching && (
            <div className="px-4 py-3">
              <p className="text-xs text-text-muted">
                No matches for &ldquo;{query.trim()}&rdquo;. Try a different
                spelling or the exact ticker.
              </p>
            </div>
          )}

          {/* Result count when done */}
          {!searching && results.length > 0 && (
            <div className="border-t border-white/[0.04] px-4 py-1.5">
              <p className="text-[10px] text-text-muted/40">
                {results.length} match{results.length !== 1 ? "es" : ""}
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
