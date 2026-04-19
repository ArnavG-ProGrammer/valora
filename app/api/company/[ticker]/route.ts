import { fetchCompany } from "@/lib/data/fetchCompany";
import {
  TickerNotFoundError,
  RateLimitError,
  GenericFetchError,
} from "@/lib/types";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/company/[ticker]">
) {
  const { ticker } = await ctx.params;

  if (!ticker || ticker.length > 10) {
    return Response.json(
      { error: "Invalid ticker symbol" },
      { status: 400 }
    );
  }

  try {
    const data = await fetchCompany(ticker);
    return Response.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    });
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

    return Response.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
