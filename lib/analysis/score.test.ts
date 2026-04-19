import { describe, it, expect } from "vitest";
import {
  calculateCAGR,
  calculateVolatility,
  calculateDrawdown,
  growthScore,
  riskScore,
  valuationScore,
  verdict,
  runAnalysis,
} from "./score";
import type { CompanyData } from "@/lib/types";

// ── Helper to build minimal CompanyData with overrides ─────────
function makeData(overrides: Partial<CompanyData> = {}): CompanyData {
  return {
    identity: {
      ticker: "TEST",
      name: "Test Corp",
      exchange: "NYSE",
      currency: "USD",
      sector: "Technology",
      industry: "Software",
      country: "US",
      website: null,
      summary: null,
    },
    price: {
      current: 100,
      dayChange: 1,
      dayChangePct: 0.01,
      dayHigh: 101,
      dayLow: 99,
      yearHigh: 120,
      yearLow: 80,
      marketCap: 1e11,
    },
    valuation: {
      peRatio: null,
      forwardPE: null,
      pegRatio: null,
      priceToBook: null,
      priceToSales: null,
      evToEbitda: null,
    },
    profitability: {
      profitMargin: null,
      operatingMargin: null,
      returnOnEquity: null,
      returnOnAssets: null,
      grossMargin: null,
    },
    balance: {
      totalCash: null,
      totalDebt: null,
      debtToEquity: null,
      currentRatio: null,
      quickRatio: null,
    },
    growth: {
      revenueGrowthYoY: null,
      earningsGrowthYoY: null,
      revenueTTM: null,
      earningsTTM: null,
    },
    dividend: { yield: null, payoutRatio: null },
    history: [],
    statements: { income: [], balance: [], cashFlow: [] },
    beta: null,
    fetchedAt: new Date().toISOString(),
    ...overrides,
  };
}

/** Generate synthetic price series with a fixed daily return */
function makePrices(
  n: number,
  startPrice: number,
  dailyReturn: number
): { date: string; close: number }[] {
  const prices = [];
  let price = startPrice;
  const baseDate = new Date("2024-01-01");
  for (let i = 0; i < n; i++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + i);
    prices.push({ date: d.toISOString().slice(0, 10), close: price });
    price *= 1 + dailyReturn;
  }
  return prices;
}

// ════════════════════════════════════════════════════════════════
// calculateCAGR
// ════════════════════════════════════════════════════════════════
describe("calculateCAGR", () => {
  it("computes correct CAGR for simple doubling over 3 years", () => {
    const result = calculateCAGR([100, 120, 160, 200], 3);
    expect(result).not.toBeNull();
    // (200/100)^(1/3) - 1 ≈ 0.2599
    expect(result!).toBeCloseTo(0.2599, 3);
  });

  it("returns null for empty array", () => {
    expect(calculateCAGR([], 3)).toBeNull();
  });

  it("returns null for single value", () => {
    expect(calculateCAGR([100], 3)).toBeNull();
  });

  it("returns null if start is zero", () => {
    expect(calculateCAGR([0, 100, 200], 2)).toBeNull();
  });

  it("returns null if start is negative", () => {
    expect(calculateCAGR([-50, 100, 200], 2)).toBeNull();
  });

  it("returns null if end is null", () => {
    expect(calculateCAGR([100, null], 1)).toBeNull();
  });

  it("returns null if years is zero", () => {
    expect(calculateCAGR([100, 200], 0)).toBeNull();
  });

  it("handles no-growth correctly", () => {
    const result = calculateCAGR([100, 100, 100], 2);
    expect(result).toBeCloseTo(0, 5);
  });

  it("handles negative growth (shrinking revenue)", () => {
    const result = calculateCAGR([200, 150, 100], 2);
    expect(result).not.toBeNull();
    // (100/200)^(1/2) - 1 ≈ -0.2929
    expect(result!).toBeCloseTo(-0.2929, 3);
  });
});

// ════════════════════════════════════════════════════════════════
// calculateVolatility
// ════════════════════════════════════════════════════════════════
describe("calculateVolatility", () => {
  it("returns null for too few prices", () => {
    const prices = [
      { date: "2024-01-01", close: 100 },
      { date: "2024-01-02", close: 101 },
    ];
    expect(calculateVolatility(prices)).toBeNull();
  });

  it("returns ~0 for constant prices", () => {
    const prices = makePrices(100, 100, 0);
    const vol = calculateVolatility(prices);
    expect(vol).not.toBeNull();
    expect(vol!).toBeCloseTo(0, 5);
  });

  it("returns reasonable annualized vol for moderate daily moves", () => {
    // Generate 252 days of random-ish prices with ~1% daily std dev
    // Using alternating +1%, -1% to create known volatility
    const prices: { date: string; close: number }[] = [];
    let price = 100;
    for (let i = 0; i < 252; i++) {
      const d = new Date("2024-01-01");
      d.setDate(d.getDate() + i);
      prices.push({ date: d.toISOString().slice(0, 10), close: price });
      price *= i % 2 === 0 ? 1.01 : 0.99;
    }
    const vol = calculateVolatility(prices);
    expect(vol).not.toBeNull();
    // ~1% daily → ~15.9% annualized (sqrt(252) * 0.01)
    expect(vol!).toBeGreaterThan(0.1);
    expect(vol!).toBeLessThan(0.25);
  });

  it("detects high volatility from large daily swings", () => {
    const prices: { date: string; close: number }[] = [];
    let price = 100;
    for (let i = 0; i < 100; i++) {
      const d = new Date("2024-01-01");
      d.setDate(d.getDate() + i);
      prices.push({ date: d.toISOString().slice(0, 10), close: price });
      price *= i % 2 === 0 ? 1.05 : 0.95; // 5% daily swings
    }
    const vol = calculateVolatility(prices);
    expect(vol).not.toBeNull();
    expect(vol!).toBeGreaterThan(0.5); // should be very high
  });
});

// ════════════════════════════════════════════════════════════════
// calculateDrawdown
// ════════════════════════════════════════════════════════════════
describe("calculateDrawdown", () => {
  it("returns null for single price", () => {
    expect(calculateDrawdown([{ date: "2024-01-01", close: 100 }])).toBeNull();
  });

  it("returns null for monotonically increasing prices", () => {
    const prices = makePrices(50, 100, 0.01);
    expect(calculateDrawdown(prices)).toBeNull();
  });

  it("calculates correct drawdown for peak-to-trough", () => {
    const prices = [
      { date: "2024-01-01", close: 100 },
      { date: "2024-01-02", close: 120 }, // peak
      { date: "2024-01-03", close: 90 }, // trough: (90-120)/120 = -0.25
      { date: "2024-01-04", close: 110 },
    ];
    const dd = calculateDrawdown(prices);
    expect(dd).not.toBeNull();
    expect(dd!).toBeCloseTo(-0.25, 5);
  });

  it("finds the worst drawdown, not the first", () => {
    const prices = [
      { date: "2024-01-01", close: 100 },
      { date: "2024-01-02", close: 90 }, // -10% from 100
      { date: "2024-01-03", close: 200 }, // new peak
      { date: "2024-01-04", close: 100 }, // -50% from 200 ← this is worse
      { date: "2024-01-05", close: 150 },
    ];
    const dd = calculateDrawdown(prices);
    expect(dd!).toBeCloseTo(-0.5, 5);
  });
});

// ════════════════════════════════════════════════════════════════
// growthScore
// ════════════════════════════════════════════════════════════════
describe("growthScore", () => {
  it("returns null score when all growth data is missing", () => {
    const data = makeData();
    const result = growthScore(data);
    expect(result.score).toBeNull();
    expect(result.breakdown.weightUsed).toBe(0);
  });

  it("scores high for strong growth", () => {
    const data = makeData({
      growth: {
        revenueGrowthYoY: 0.25,
        earningsGrowthYoY: 0.3,
        revenueTTM: 1e10,
        earningsTTM: 2e9,
      },
      statements: {
        income: [
          { date: "2021-12-31", revenue: 5e9, grossProfit: null, operatingIncome: null, netIncome: null, eps: null },
          { date: "2022-12-31", revenue: 6e9, grossProfit: null, operatingIncome: null, netIncome: null, eps: null },
          { date: "2023-12-31", revenue: 7.5e9, grossProfit: null, operatingIncome: null, netIncome: null, eps: null },
          { date: "2024-12-31", revenue: 10e9, grossProfit: null, operatingIncome: null, netIncome: null, eps: null },
        ],
        balance: [],
        cashFlow: [],
      },
    });
    const result = growthScore(data);
    expect(result.score).not.toBeNull();
    expect(result.score!).toBeGreaterThanOrEqual(70);
  });

  it("scores low for negative growth", () => {
    const data = makeData({
      growth: {
        revenueGrowthYoY: -0.15,
        earningsGrowthYoY: -0.2,
        revenueTTM: 1e10,
        earningsTTM: 2e9,
      },
    });
    const result = growthScore(data);
    expect(result.score).not.toBeNull();
    expect(result.score!).toBeLessThan(25);
  });

  it("works with partial data (only revenue YoY)", () => {
    const data = makeData({
      growth: {
        revenueGrowthYoY: 0.10,
        earningsGrowthYoY: null,
        revenueTTM: null,
        earningsTTM: null,
      },
    });
    const result = growthScore(data);
    expect(result.score).not.toBeNull();
    expect(result.breakdown.weightUsed).toBe(40); // only revYoY weight
  });
});

// ════════════════════════════════════════════════════════════════
// riskScore
// ════════════════════════════════════════════════════════════════
describe("riskScore", () => {
  it("returns null when all risk data is missing", () => {
    const data = makeData();
    const result = riskScore(data);
    expect(result.score).toBeNull();
  });

  it("scores low risk for stable company", () => {
    const data = makeData({
      history: makePrices(252, 100, 0.0003), // tiny daily moves
      balance: {
        totalCash: 5e9,
        totalDebt: 2e9,
        debtToEquity: 30, // 0.3x
        currentRatio: 2.5,
        quickRatio: 2.0,
      },
      beta: 0.9,
    });
    const result = riskScore(data);
    expect(result.score).not.toBeNull();
    expect(result.score!).toBeLessThan(35);
  });

  it("scores high risk for volatile leveraged company", () => {
    // Create volatile prices
    const prices: { date: string; close: number }[] = [];
    let price = 100;
    for (let i = 0; i < 252; i++) {
      const d = new Date("2024-01-01");
      d.setDate(d.getDate() + i);
      prices.push({ date: d.toISOString().slice(0, 10), close: price });
      price *= i % 2 === 0 ? 1.04 : 0.96;
    }

    const data = makeData({
      history: prices,
      balance: {
        totalCash: 1e8,
        totalDebt: 5e9,
        debtToEquity: 350, // 3.5x
        currentRatio: 0.6,
        quickRatio: 0.4,
      },
      beta: 2.1,
    });
    const result = riskScore(data);
    expect(result.score).not.toBeNull();
    expect(result.score!).toBeGreaterThan(60);
  });
});

// ════════════════════════════════════════════════════════════════
// valuationScore
// ════════════════════════════════════════════════════════════════
describe("valuationScore", () => {
  it("returns null score and 'Insufficient Data' when all null", () => {
    const data = makeData();
    const result = valuationScore(data);
    expect(result.score).toBeNull();
    expect(result.label).toBe("Insufficient Data");
  });

  it("labels cheap stocks as undervalued", () => {
    const data = makeData({
      valuation: {
        peRatio: 10,
        forwardPE: 9,
        pegRatio: 0.5,
        priceToBook: 0.8,
        priceToSales: 1.0,
        evToEbitda: 6,
      },
    });
    const result = valuationScore(data);
    expect(result.score).not.toBeNull();
    expect(result.score!).toBeLessThan(35);
    expect(["Deeply Undervalued", "Undervalued"]).toContain(result.label);
  });

  it("labels expensive stocks as overvalued", () => {
    const data = makeData({
      valuation: {
        peRatio: 60,
        forwardPE: 55,
        pegRatio: 3.5,
        priceToBook: 15,
        priceToSales: 20,
        evToEbitda: 40,
      },
    });
    const result = valuationScore(data);
    expect(result.score).not.toBeNull();
    expect(result.score!).toBeGreaterThan(70);
    expect(["Overvalued", "Significantly Overvalued"]).toContain(result.label);
  });
});

// ════════════════════════════════════════════════════════════════
// verdict
// ════════════════════════════════════════════════════════════════
describe("verdict", () => {
  it("returns Watch + Low confidence when 2+ scores are null", () => {
    const g = { score: null, breakdown: { revenueGrowthYoY: { value: null, points: null }, revenueCagr3y: { value: null, points: null }, earningsGrowthYoY: { value: null, points: null }, weightUsed: 0 } };
    const r = { score: null, breakdown: { volatility: { value: null, points: null }, debtToEquity: { value: null, points: null }, currentRatio: { value: null, points: null }, betaDeviation: { value: null, points: null }, weightUsed: 0 } };
    const v = { score: 50 as number | null, label: "Fairly Valued" as const, breakdown: { pe: { value: 20 as number | null, points: 40 as number | null }, peg: { value: null, points: null }, pb: { value: null, points: null }, ps: { value: null, points: null }, weightUsed: 30 } };

    const result = verdict(g, r, v);
    expect(result.call).toBe("Watch");
    expect(result.confidence).toBe("Low");
  });

  it("returns Buy + High for high growth, low risk, undervalued", () => {
    const g = { score: 80, breakdown: { revenueGrowthYoY: { value: 0.25, points: 90 }, revenueCagr3y: { value: 0.2, points: 85 }, earningsGrowthYoY: { value: 0.3, points: 95 }, weightUsed: 100 } };
    const r = { score: 25, breakdown: { volatility: { value: 0.15, points: 20 }, debtToEquity: { value: 0.3, points: 20 }, currentRatio: { value: 2.5, points: 20 }, betaDeviation: { value: 0.1, points: 24 }, weightUsed: 100 } };
    const v = { score: 25, label: "Undervalued" as const, breakdown: { pe: { value: 12, points: 20 }, peg: { value: 0.8, points: 27 }, pb: { value: 1.5, points: 33 }, ps: { value: 1.0, points: 15 }, weightUsed: 100 } };

    const result = verdict(g, r, v);
    expect(result.call).toBe("Buy");
    expect(result.confidence).toBe("High");
  });

  it("returns Avoid for high risk + overvalued", () => {
    const g = { score: 30, breakdown: { revenueGrowthYoY: { value: -0.05, points: 15 }, revenueCagr3y: { value: null, points: null }, earningsGrowthYoY: { value: -0.1, points: 10 }, weightUsed: 70 } };
    const r = { score: 75, breakdown: { volatility: { value: 0.45, points: 85 }, debtToEquity: { value: 2.5, points: 83 }, currentRatio: { value: 0.7, points: 65 }, betaDeviation: { value: 0.8, points: 48 }, weightUsed: 100 } };
    const v = { score: 80, label: "Significantly Overvalued" as const, breakdown: { pe: { value: 55, points: 84 }, peg: { value: 3.0, points: 75 }, pb: { value: 8, points: 73 }, ps: { value: 12, points: 81 }, weightUsed: 100 } };

    const result = verdict(g, r, v);
    expect(result.call).toBe("Avoid");
  });

  it("reasoning always contains actual numbers", () => {
    const g = { score: 60, breakdown: { revenueGrowthYoY: { value: 0.12, points: 62 }, revenueCagr3y: { value: null, points: null }, earningsGrowthYoY: { value: 0.08, points: 48 }, weightUsed: 70 } };
    const r = { score: 40, breakdown: { volatility: { value: 0.22, points: 23 }, debtToEquity: { value: 0.8, points: 38 }, currentRatio: { value: 1.5, points: 35 }, betaDeviation: { value: 0.15, points: 25 }, weightUsed: 100 } };
    const v = { score: 50, label: "Fairly Valued" as const, breakdown: { pe: { value: 22, points: 43 }, peg: { value: 1.5, points: 45 }, pb: { value: 2.0, points: 40 }, ps: { value: 3.0, points: 40 }, weightUsed: 100 } };

    const result = verdict(g, r, v);
    expect(result.reasoning.length).toBeGreaterThanOrEqual(2);
    // Check reasoning references actual data
    const joined = result.reasoning.join(" ");
    expect(joined).toMatch(/\d/); // contains numbers
    expect(joined).toMatch(/\/100/); // references scores
  });
});

// ════════════════════════════════════════════════════════════════
// runAnalysis (integration)
// ════════════════════════════════════════════════════════════════
describe("runAnalysis", () => {
  it("returns complete AnalysisResult even with all-null data", () => {
    const data = makeData();
    const result = runAnalysis(data);
    expect(result).toHaveProperty("growth");
    expect(result).toHaveProperty("risk");
    expect(result).toHaveProperty("valuation");
    expect(result).toHaveProperty("verdict");
    expect(result).toHaveProperty("derived");
    expect(result.verdict.call).toBe("Watch");
    expect(result.verdict.confidence).toBe("Low");
  });

  it("returns fully populated result with complete data", () => {
    const data = makeData({
      growth: {
        revenueGrowthYoY: 0.15,
        earningsGrowthYoY: 0.18,
        revenueTTM: 50e9,
        earningsTTM: 10e9,
      },
      valuation: {
        peRatio: 22,
        forwardPE: 18,
        pegRatio: 1.2,
        priceToBook: 4,
        priceToSales: 5,
        evToEbitda: 15,
      },
      balance: {
        totalCash: 20e9,
        totalDebt: 15e9,
        debtToEquity: 60,
        currentRatio: 1.8,
        quickRatio: 1.5,
      },
      history: makePrices(252, 100, 0.001),
      statements: {
        income: [
          { date: "2021-12-31", revenue: 30e9, grossProfit: null, operatingIncome: null, netIncome: null, eps: null },
          { date: "2022-12-31", revenue: 35e9, grossProfit: null, operatingIncome: null, netIncome: null, eps: null },
          { date: "2023-12-31", revenue: 42e9, grossProfit: null, operatingIncome: null, netIncome: null, eps: null },
          { date: "2024-12-31", revenue: 50e9, grossProfit: null, operatingIncome: null, netIncome: null, eps: null },
        ],
        balance: [],
        cashFlow: [],
      },
      beta: 1.1,
    });

    const result = runAnalysis(data);
    expect(result.growth.score).not.toBeNull();
    expect(result.risk.score).not.toBeNull();
    expect(result.valuation.score).not.toBeNull();
    expect(result.derived.cagr3y).not.toBeNull();
    expect(result.derived.volatility).not.toBeNull();
    expect(["Buy", "Hold", "Watch", "Avoid"]).toContain(result.verdict.call);
    expect(result.verdict.reasoning.length).toBeGreaterThanOrEqual(2);
  });
});
