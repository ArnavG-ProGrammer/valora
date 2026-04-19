import { z } from "zod";

// ── Ticker input ───────────────────────────────────────────────
export const TickerInputSchema = z.object({
  symbol: z
    .string()
    .min(1)
    .max(10)
    .transform((s) => s.toUpperCase().trim()),
});
export type TickerInput = z.infer<typeof TickerInputSchema>;

// ── Company identity ───────────────────────────────────────────
export interface CompanyIdentity {
  ticker: string;
  name: string | null;
  exchange: string | null;
  currency: string | null;
  sector: string | null;
  industry: string | null;
  country: string | null;
  website: string | null;
  summary: string | null;
}

// ── Price snapshot ─────────────────────────────────────────────
export interface PriceData {
  current: number | null;
  dayChange: number | null;
  dayChangePct: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  yearHigh: number | null;
  yearLow: number | null;
  marketCap: number | null;
}

// ── Valuation metrics ──────────────────────────────────────────
export interface ValuationData {
  peRatio: number | null;
  forwardPE: number | null;
  pegRatio: number | null;
  priceToBook: number | null;
  priceToSales: number | null;
  evToEbitda: number | null;
}

// ── Profitability metrics ──────────────────────────────────────
export interface ProfitabilityData {
  profitMargin: number | null;
  operatingMargin: number | null;
  returnOnEquity: number | null;
  returnOnAssets: number | null;
  grossMargin: number | null;
}

// ── Balance sheet health ───────────────────────────────────────
export interface BalanceData {
  totalCash: number | null;
  totalDebt: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
  quickRatio: number | null;
}

// ── Growth metrics ─────────────────────────────────────────────
export interface GrowthData {
  revenueGrowthYoY: number | null;
  earningsGrowthYoY: number | null;
  revenueTTM: number | null;
  earningsTTM: number | null;
}

// ── Dividend data ──────────────────────────────────────────────
export interface DividendData {
  yield: number | null;
  payoutRatio: number | null;
}

// ── Historical price point (for charts) ────────────────────────
export interface HistoryPoint {
  date: string; // YYYY-MM-DD
  close: number;
}

// ── Financial statement line items ─────────────────────────────
export interface IncomeStatement {
  date: string;
  revenue: number | null;
  grossProfit: number | null;
  operatingIncome: number | null;
  netIncome: number | null;
  eps: number | null;
}

export interface BalanceSheet {
  date: string;
  totalAssets: number | null;
  totalLiabilities: number | null;
  totalEquity: number | null;
  cash: number | null;
  totalDebt: number | null;
}

export interface CashFlowStatement {
  date: string;
  operatingCashFlow: number | null;
  capitalExpenditure: number | null;
  freeCashFlow: number | null;
}

export interface StatementsData {
  income: IncomeStatement[];
  balance: BalanceSheet[];
  cashFlow: CashFlowStatement[];
}

// ── Aggregated company data ────────────────────────────────────
export interface CompanyData {
  identity: CompanyIdentity;
  price: PriceData;
  valuation: ValuationData;
  profitability: ProfitabilityData;
  balance: BalanceData;
  growth: GrowthData;
  dividend: DividendData;
  history: HistoryPoint[];
  statements: StatementsData;
  beta: number | null;
  fetchedAt: string; // ISO timestamp
}

// ── Analysis scores (deterministic, computed in code) ──────────
export interface AnalysisScores {
  valuation: number; // 0-100
  growth: number;
  profitability: number;
  health: number;
  momentum: number;
  overall: number;
}

// ── Analysis result (output of /lib/analysis/score.ts) ─────────
export interface GrowthScoreResult {
  score: number | null;
  breakdown: {
    revenueGrowthYoY: { value: number | null; points: number | null };
    revenueCagr3y: { value: number | null; points: number | null };
    earningsGrowthYoY: { value: number | null; points: number | null };
    weightUsed: number;
  };
}

export interface RiskScoreResult {
  score: number | null;
  breakdown: {
    volatility: { value: number | null; points: number | null };
    debtToEquity: { value: number | null; points: number | null };
    currentRatio: { value: number | null; points: number | null };
    betaDeviation: { value: number | null; points: number | null };
    weightUsed: number;
  };
}

export type ValuationLabel =
  | "Deeply Undervalued"
  | "Undervalued"
  | "Fairly Valued"
  | "Overvalued"
  | "Significantly Overvalued"
  | "Insufficient Data";

export interface ValuationScoreResult {
  score: number | null;
  label: ValuationLabel;
  breakdown: {
    pe: { value: number | null; points: number | null };
    peg: { value: number | null; points: number | null };
    pb: { value: number | null; points: number | null };
    ps: { value: number | null; points: number | null };
    weightUsed: number;
  };
}

export interface VerdictResult {
  call: "Buy" | "Hold" | "Watch" | "Avoid";
  confidence: "Low" | "Medium" | "High";
  reasoning: string[];
}

export interface DerivedMetrics {
  cagr3y: number | null;
  volatility: number | null;
  maxDrawdown: number | null;
}

export interface AnalysisResult {
  growth: GrowthScoreResult;
  risk: RiskScoreResult;
  valuation: ValuationScoreResult;
  verdict: VerdictResult;
  derived: DerivedMetrics;
}

// ── Memo output ────────────────────────────────────────────────
export interface InvestmentMemo {
  symbol: string;
  companyName: string;
  generatedAt: string;
  scores: AnalysisScores;
  prose: {
    summary: string;
    valuation: string;
    growth: string;
    profitability: string;
    risks: string;
    catalysts: string;
    verdict: string;
  };
  data: CompanyData;
}

// ── Fetch errors ───────────────────────────────────────────────
export class TickerNotFoundError extends Error {
  constructor(ticker: string) {
    super(`Ticker "${ticker}" not found`);
    this.name = "TickerNotFoundError";
  }
}

export class RateLimitError extends Error {
  constructor() {
    super("Yahoo Finance rate limit exceeded. Try again in a moment.");
    this.name = "RateLimitError";
  }
}

export class GenericFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GenericFetchError";
  }
}
