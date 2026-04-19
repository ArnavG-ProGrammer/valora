import { fetchCompany } from "@/lib/data/fetchCompany";
import { runAnalysis } from "@/lib/analysis/score";
import { generateMemo } from "@/lib/ai/generateMemo";
import { checkRateLimit } from "@/lib/rateLimit";
import {
  TickerNotFoundError,
  RateLimitError,
  GenericFetchError,
} from "@/lib/types";

const RATE_LIMIT = 10; // requests
const RATE_WINDOW = 60 * 1000; // per minute

function getClientIP(req: Request): string {
  // Check common proxy headers
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

export async function POST(req: Request) {
  // ── Rate limit check ─────────────────────────────────────────
  const ip = getClientIP(req);
  const { allowed, retryAfterMs } = checkRateLimit(
    `memo:${ip}`,
    RATE_LIMIT,
    RATE_WINDOW
  );

  if (!allowed) {
    return Response.json(
      {
        error: `Rate limit exceeded. Max ${RATE_LIMIT} memo requests per minute. Try again in ${Math.ceil(retryAfterMs / 1000)} seconds.`,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(retryAfterMs / 1000)),
        },
      }
    );
  }

  // ── Parse body ───────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const ticker =
    typeof body === "object" &&
    body !== null &&
    "ticker" in body &&
    typeof (body as Record<string, unknown>).ticker === "string"
      ? ((body as Record<string, unknown>).ticker as string).trim()
      : null;

  if (!ticker || ticker.length === 0 || ticker.length > 10) {
    return Response.json(
      {
        error:
          'Provide a valid ticker symbol in the request body: { "ticker": "AAPL" }',
      },
      { status: 400 }
    );
  }

  try {
    // 1. Fetch real data from Yahoo Finance
    const data = await fetchCompany(ticker);

    // 2. Run deterministic analysis (pure math, no LLM)
    const analysis = runAnalysis(data);

    // 3. Generate prose around the locked numbers
    const memo = await generateMemo(data, analysis);

    // 4. Return the full bundle
    return Response.json(
      {
        ticker: data.identity.ticker,
        companyName: data.identity.name,
        generatedAt: new Date().toISOString(),
        data,
        analysis,
        memo,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err) {
    if (err instanceof TickerNotFoundError) {
      return Response.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof RateLimitError) {
      return Response.json({ error: err.message }, { status: 429 });
    }
    if (err instanceof GenericFetchError) {
      return Response.json({ error: err.message }, { status: 502 });
    }

    const message =
      err instanceof Error ? err.message : "An unexpected error occurred";
    return Response.json({ error: message }, { status: 500 });
  }
}
