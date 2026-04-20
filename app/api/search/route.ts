import YahooFinance from "yahoo-finance2";
import { checkRateLimit } from "@/lib/rateLimit";
import { MARKETS } from "@/lib/markets";

const yf = new YahooFinance({ suppressNotices: ["ripHistorical"] });

const RATE_LIMIT = 60;
const RATE_WINDOW = 60 * 1000;

// Build lookup maps from MARKETS config
const EXCHANGE_MAP: Record<string, string[]> = {};
const SUFFIX_MAP: Record<string, string> = {};
for (const m of MARKETS) {
  EXCHANGE_MAP[m.id] = m.yahooExchanges;
  SUFFIX_MAP[m.id] = m.suffix;
}

function getClientIP(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

export async function GET(req: Request) {
  const ip = getClientIP(req);
  const { allowed, retryAfterMs } = checkRateLimit(
    `search:${ip}`,
    RATE_LIMIT,
    RATE_WINDOW
  );

  if (!allowed) {
    return Response.json(
      { results: [], error: "rate_limited" },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) },
      }
    );
  }

  const url = new URL(req.url);
  const query = url.searchParams.get("q")?.trim();
  const market = url.searchParams.get("market") || "NSE";

  if (!query || query.length < 1) {
    return Response.json({ results: [] });
  }

  try {
    const suffix = SUFFIX_MAP[market] || "";
    const allowedExchanges = EXCHANGE_MAP[market] || [];

    // Multi-query fanout with market-aware variants
    const variants = [
      query,
      suffix ? `${query}${suffix}` : query,
      `${query} ${market}`,
    ];
    const uniqueVariants = [...new Set(variants)];

    const searchPromises = uniqueVariants.map((v) =>
      yf
        .search(v, { quotesCount: 15, newsCount: 0, enableFuzzyQuery: true })
        .catch(() => ({ quotes: [] as Record<string, unknown>[] }))
    );

    const responses = await Promise.all(searchPromises);
    const allQuotes = responses.flatMap(
      (r) => (r.quotes || []) as Record<string, unknown>[]
    );

    // Dedupe by symbol
    const seen = new Set<string>();
    const unique = allQuotes.filter((q) => {
      const sym = q.symbol as string | undefined;
      if (!sym || seen.has(sym)) return false;
      seen.add(sym);
      return true;
    });

    // Filter to selected market's exchanges only
    const filtered = unique.filter((q) => {
      if (q.quoteType !== "EQUITY" && q.quoteType !== "ETF") return false;
      const exchange = q.exchange as string | undefined;
      if (exchange && allowedExchanges.includes(exchange)) return true;
      const sym = ((q.symbol as string) || "").toUpperCase();
      if (suffix && sym.endsWith(suffix.toUpperCase())) return true;
      return false;
    });

    // Score and sort
    const q = query.toUpperCase();
    const scored = filtered.map((item) => {
      const symbol = ((item.symbol as string) || "").toUpperCase();
      const name = (
        (item.shortname as string) ||
        (item.longname as string) ||
        ""
      ).toUpperCase();
      let score = 0;

      if (symbol === q || symbol === `${q}${suffix.toUpperCase()}`) {
        score += 1000;
      } else if (symbol.startsWith(q)) {
        score += 500;
      } else if (symbol.includes(q)) {
        score += 200;
      }

      if (name.startsWith(q)) score += 400;
      else if (name.includes(` ${q}`)) score += 300;
      else if (name.includes(q)) score += 150;

      return {
        ticker: item.symbol as string,
        name:
          (item.shortname as string) ||
          (item.longname as string) ||
          (item.symbol as string),
        exchange:
          (item.exchDisp as string) || (item.exchange as string) || "",
        score,
      };
    });

    const sorted = scored
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(({ score: _s, ...rest }) => rest);

    return Response.json(
      { results: sorted, market },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
        },
      }
    );
  } catch {
    return Response.json(
      { results: [], error: "search_failed" },
      { status: 500 }
    );
  }
}
