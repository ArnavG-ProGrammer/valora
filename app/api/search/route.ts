import YahooFinance from "yahoo-finance2";
import { checkRateLimit } from "@/lib/rateLimit";

const yf = new YahooFinance({ suppressNotices: ["ripHistorical"] });

const RATE_LIMIT = 30;
const RATE_WINDOW = 60 * 1000;

function getClientIP(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

function inferFlag(symbol: string): string {
  if (symbol.endsWith(".NS") || symbol.endsWith(".BO")) return "\u{1F1EE}\u{1F1F3}";
  if (symbol.endsWith(".L")) return "\u{1F1EC}\u{1F1E7}";
  if (symbol.endsWith(".T")) return "\u{1F1EF}\u{1F1F5}";
  if (symbol.endsWith(".HK")) return "\u{1F1ED}\u{1F1F0}";
  if (symbol.endsWith(".PA")) return "\u{1F1EB}\u{1F1F7}";
  if (symbol.endsWith(".DE")) return "\u{1F1E9}\u{1F1EA}";
  if (symbol.endsWith(".TO")) return "\u{1F1E8}\u{1F1E6}";
  if (symbol.endsWith(".AX")) return "\u{1F1E6}\u{1F1FA}";
  return "\u{1F1FA}\u{1F1F8}";
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
  const query = url.searchParams.get("q");

  if (!query || query.trim().length < 1) {
    return Response.json({ results: [] });
  }

  try {
    const data = await yf.search(query.trim(), {
      quotesCount: 10,
      newsCount: 0,
      enableFuzzyQuery: true,
    });

    const results = (data.quotes || [])
      .filter(
        (q: Record<string, unknown>) =>
          q.symbol && (q.quoteType === "EQUITY" || q.quoteType === "ETF")
      )
      .slice(0, 8)
      .map((q: Record<string, unknown>) => ({
        ticker: q.symbol as string,
        name:
          (q.shortname as string) ||
          (q.longname as string) ||
          (q.symbol as string),
        exchange: (q.exchDisp as string) || (q.exchange as string) || "",
        flag: inferFlag(q.symbol as string),
      }));

    return Response.json(
      { results },
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
