import YahooFinance from "yahoo-finance2";
import type {
  CompanyData,
  IncomeStatement,
  BalanceSheet,
  CashFlowStatement,
  HistoryPoint,
} from "@/lib/types";
import {
  TickerNotFoundError,
  RateLimitError,
  GenericFetchError,
} from "@/lib/types";

const yf = new YahooFinance({ suppressNotices: ["ripHistorical"] });

// Safe accessor: return null instead of undefined
function n(val: number | undefined | null): number | null {
  return val != null && isFinite(val) ? val : null;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function dateStringAgo(years: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().slice(0, 10);
}

async function fetchForTicker(symbol: string): Promise<CompanyData> {
  // Fetch quoteSummary + chart + fundamentals in parallel
  const [summary, chartResult, fundamentalsFinancials, fundamentalsBS, fundamentalsCF] =
    await Promise.all([
      yf.quoteSummary(symbol, {
        modules: [
          "price",
          "summaryDetail",
          "defaultKeyStatistics",
          "financialData",
          "assetProfile",
          "earnings",
        ],
      }),
      yf.chart(symbol, {
        period1: dateStringAgo(1),
        interval: "1d",
      }),
      yf.fundamentalsTimeSeries(symbol, {
        period1: dateStringAgo(5),
        type: "annual",
        module: "financials",
      }),
      yf.fundamentalsTimeSeries(symbol, {
        period1: dateStringAgo(5),
        type: "annual",
        module: "balance-sheet",
      }),
      yf.fundamentalsTimeSeries(symbol, {
        period1: dateStringAgo(5),
        type: "annual",
        module: "cash-flow",
      }),
    ]);

  const price = summary.price;
  const detail = summary.summaryDetail;
  const keyStats = summary.defaultKeyStatistics;
  const financial = summary.financialData;
  const profile = summary.assetProfile;

  // ── Map historical prices from chart quotes ──────────────────
  const historyPoints: HistoryPoint[] = chartResult.quotes
    .filter((q) => q.close != null)
    .map((q) => ({
      date: formatDate(q.date),
      close: q.close!,
    }));

  // ── Map financial statements from fundamentalsTimeSeries ─────
  const incomeStatements: IncomeStatement[] = fundamentalsFinancials
    .slice(-4)
    .map((row) => {
      const r = row as Record<string, unknown>;
      return {
        date: formatDate(row.date),
        revenue: n(r.totalRevenue as number | undefined),
        grossProfit: n(r.grossProfit as number | undefined),
        operatingIncome: n(r.operatingIncome as number | undefined),
        netIncome: n(r.netIncome as number | undefined),
        eps: n(r.dilutedEPS as number | undefined),
      };
    });

  const balanceSheets: BalanceSheet[] = fundamentalsBS
    .slice(-4)
    .map((row) => {
      const r = row as Record<string, unknown>;
      return {
        date: formatDate(row.date),
        totalAssets: n(r.totalAssets as number | undefined),
        totalLiabilities: n(
          r.totalLiabilitiesNetMinorityInterest as number | undefined
        ),
        totalEquity: n(r.stockholdersEquity as number | undefined),
        cash: n(r.cashAndCashEquivalents as number | undefined),
        totalDebt: n(r.totalDebt as number | undefined),
      };
    });

  const cashFlowStatements: CashFlowStatement[] = fundamentalsCF
    .slice(-4)
    .map((row) => {
      const r = row as Record<string, unknown>;
      return {
        date: formatDate(row.date),
        operatingCashFlow: n(r.operatingCashFlow as number | undefined),
        capitalExpenditure: n(r.capitalExpenditure as number | undefined),
        freeCashFlow: n(r.freeCashFlow as number | undefined),
      };
    });

  return {
    identity: {
      ticker: price?.symbol ?? symbol,
      name: price?.longName ?? price?.shortName ?? null,
      exchange: price?.exchangeName ?? null,
      currency: price?.currency ?? detail?.currency ?? null,
      sector: profile?.sector ?? null,
      industry: profile?.industry ?? null,
      country: profile?.country ?? null,
      website: profile?.website ?? null,
      summary: profile?.longBusinessSummary ?? null,
    },
    price: {
      current: n(price?.regularMarketPrice),
      dayChange: n(price?.regularMarketChange),
      dayChangePct: n(price?.regularMarketChangePercent),
      dayHigh: n(price?.regularMarketDayHigh ?? detail?.dayHigh),
      dayLow: n(price?.regularMarketDayLow ?? detail?.dayLow),
      yearHigh: n(detail?.fiftyTwoWeekHigh),
      yearLow: n(detail?.fiftyTwoWeekLow),
      marketCap: n(price?.marketCap ?? detail?.marketCap),
    },
    valuation: {
      peRatio: n(detail?.trailingPE),
      forwardPE: n(detail?.forwardPE ?? keyStats?.forwardPE),
      pegRatio: n(keyStats?.pegRatio),
      priceToBook: n(keyStats?.priceToBook),
      priceToSales: n(detail?.priceToSalesTrailing12Months),
      evToEbitda: n(keyStats?.enterpriseToEbitda),
    },
    profitability: {
      profitMargin: n(financial?.profitMargins),
      operatingMargin: n(financial?.operatingMargins),
      returnOnEquity: n(financial?.returnOnEquity),
      returnOnAssets: n(financial?.returnOnAssets),
      grossMargin: n(financial?.grossMargins),
    },
    balance: {
      totalCash: n(financial?.totalCash),
      totalDebt: n(financial?.totalDebt),
      debtToEquity: n(financial?.debtToEquity),
      currentRatio: n(financial?.currentRatio),
      quickRatio: n(financial?.quickRatio),
    },
    growth: {
      revenueGrowthYoY: n(financial?.revenueGrowth),
      earningsGrowthYoY: n(financial?.earningsGrowth),
      revenueTTM: n(financial?.totalRevenue),
      earningsTTM: n(keyStats?.netIncomeToCommon),
    },
    dividend: {
      yield: n(detail?.dividendYield),
      payoutRatio: n(detail?.payoutRatio),
    },
    history: historyPoints,
    statements: {
      income: incomeStatements,
      balance: balanceSheets,
      cashFlow: cashFlowStatements,
    },
    beta: n(keyStats?.beta ?? detail?.beta),
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Fetch comprehensive company data for a given ticker.
 * Auto-retries with .NS suffix for Indian stocks.
 */
export async function fetchCompany(ticker: string): Promise<CompanyData> {
  const clean = ticker.toUpperCase().trim();

  try {
    return await fetchForTicker(clean);
  } catch (firstError) {
    // If it already has an exchange suffix, don't retry
    if (clean.includes(".")) {
      throw classifyError(firstError, clean);
    }

    // Retry with .NS (NSE India) suffix
    try {
      return await fetchForTicker(`${clean}.NS`);
    } catch {
      // Throw the original error classified
      throw classifyError(firstError, clean);
    }
  }
}

function classifyError(err: unknown, ticker: string): Error {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();

    if (
      msg.includes("not found") ||
      msg.includes("no data") ||
      msg.includes("failed to get")
    ) {
      return new TickerNotFoundError(ticker);
    }

    if (msg.includes("too many") || msg.includes("rate limit") || msg.includes("429")) {
      return new RateLimitError();
    }

    return new GenericFetchError(err.message);
  }

  return new GenericFetchError(String(err));
}
