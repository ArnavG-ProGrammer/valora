import YahooFinance from "yahoo-finance2";
import { checkRateLimit } from "@/lib/rateLimit";

const yf = new YahooFinance({ suppressNotices: ["ripHistorical"] });

const RATE_LIMIT = 60;
const RATE_WINDOW = 60 * 1000;

function getClientIP(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

function inferFlag(symbol: string): string {
  if (!symbol) return "";
  const s = symbol.toUpperCase();
  if (s.endsWith(".NS") || s.endsWith(".BO")) return "\u{1F1EE}\u{1F1F3}";
  if (s.endsWith(".L")) return "\u{1F1EC}\u{1F1E7}";
  if (s.endsWith(".T")) return "\u{1F1EF}\u{1F1F5}";
  if (s.endsWith(".HK") || s.endsWith(".SS") || s.endsWith(".SZ")) return "\u{1F1E8}\u{1F1F3}";
  if (s.endsWith(".PA")) return "\u{1F1EB}\u{1F1F7}";
  if (s.endsWith(".DE") || s.endsWith(".F")) return "\u{1F1E9}\u{1F1EA}";
  if (s.endsWith(".AS")) return "\u{1F1F3}\u{1F1F1}";
  if (s.endsWith(".SW")) return "\u{1F1E8}\u{1F1ED}";
  if (s.endsWith(".TO") || s.endsWith(".V")) return "\u{1F1E8}\u{1F1E6}";
  if (s.endsWith(".AX")) return "\u{1F1E6}\u{1F1FA}";
  if (s.endsWith(".SA")) return "\u{1F1E7}\u{1F1F7}";
  if (s.endsWith(".MX")) return "\u{1F1F2}\u{1F1FD}";
  if (s.endsWith(".SI")) return "\u{1F1F8}\u{1F1EC}";
  if (s.endsWith(".KS")) return "\u{1F1F0}\u{1F1F7}";
  return "\u{1F1FA}\u{1F1F8}";
}

interface ScoredResult {
  ticker: string;
  name: string;
  exchange: string;
  flag: string;
  score: number;
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

  if (!query || query.length < 1) {
    return Response.json({ results: [] });
  }

  try {
    // Multi-query fanout: fire parallel searches with different variants
    // to catch Indian stocks and global small caps Yahoo misses on raw query
    const variants = [
      query,
      `${query}.NS`,
      `${query}.BO`,
      `${query} india`,
      `${query} limited`,
    ];
    const uniqueVariants = [...new Set(variants)];

    const searchPromises = uniqueVariants.map((v) =>
      yf
        .search(v, { quotesCount: 8, newsCount: 0, enableFuzzyQuery: true })
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

    // Filter to equities and ETFs
    const equities = unique.filter(
      (q) => q.quoteType === "EQUITY" || q.quoteType === "ETF"
    );

    // Score each result based on match quality
    const q = query.toUpperCase();
    const scored: ScoredResult[] = equities.map((item) => {
      const symbol = ((item.symbol as string) || "").toUpperCase();
      const name = (
        (item.shortname as string) ||
        (item.longname as string) ||
        ""
      ).toUpperCase();
      let score = 0;

      // Exact ticker match
      if (symbol === q) score += 1000;
      else if (symbol === `${q}.NS`) score += 950;
      else if (symbol === `${q}.BO`) score += 900;
      else if (symbol.startsWith(q)) score += 500;
      else if (symbol.includes(q)) score += 200;

      // Name matching
      if (name.startsWith(q)) score += 400;
      else if (name.includes(` ${q}`)) score += 300;
      else if (name.includes(q)) score += 150;

      // Boost Indian stocks so they aren't buried under US defaults
      if (symbol.endsWith(".NS") || symbol.endsWith(".BO")) score += 30;

      // Penalize obscure exchanges unless strong match
      const obscure = [".SA", ".MX", ".JK", ".KL", ".SI", ".BK"];
      if (obscure.some((s) => symbol.endsWith(s)) && score < 500) {
        score -= 50;
      }

      return {
        ticker: item.symbol as string,
        name:
          (item.shortname as string) ||
          (item.longname as string) ||
          (item.symbol as string),
        exchange:
          (item.exchDisp as string) || (item.exchange as string) || "",
        flag: inferFlag(item.symbol as string),
        score,
      };
    });

    // Sort by score, take top 10, strip score from response
    const sorted = scored
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(({ score: _s, ...rest }) => rest);

    return Response.json(
      { results: sorted, query },
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
