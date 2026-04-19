import type {
  CompanyData,
  HistoryPoint,
  GrowthScoreResult,
  RiskScoreResult,
  ValuationScoreResult,
  ValuationLabel,
  VerdictResult,
  AnalysisResult,
} from "@/lib/types";

// ════════════════════════════════════════════════════════════════
// Utility math
// ════════════════════════════════════════════════════════════════

/**
 * CAGR: (end/start)^(1/years) - 1
 * Returns null if start/end is missing, zero, or negative.
 */
export function calculateCAGR(
  values: (number | null)[],
  years: number
): number | null {
  if (values.length < 2 || years <= 0) return null;
  const start = values[0];
  const end = values[values.length - 1];
  if (start == null || end == null || start <= 0 || end <= 0) return null;
  return Math.pow(end / start, 1 / years) - 1;
}

/**
 * Annualized volatility from daily close prices.
 * Uses log returns, annualized by sqrt(252).
 * Returns a decimal (0.24 = 24%).
 */
export function calculateVolatility(
  prices: HistoryPoint[]
): number | null {
  if (prices.length < 20) return null; // need meaningful sample

  const logReturns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    const prev = prices[i - 1].close;
    const curr = prices[i].close;
    if (prev <= 0 || curr <= 0) continue;
    logReturns.push(Math.log(curr / prev));
  }

  if (logReturns.length < 10) return null;

  const mean = logReturns.reduce((s, v) => s + v, 0) / logReturns.length;
  const variance =
    logReturns.reduce((s, v) => s + (v - mean) ** 2, 0) /
    (logReturns.length - 1); // sample variance
  const dailyStdDev = Math.sqrt(variance);

  return dailyStdDev * Math.sqrt(252);
}

/**
 * Max peak-to-trough drawdown over the price window.
 * Returns a negative decimal (e.g., -0.15 for a 15% drop).
 */
export function calculateDrawdown(
  prices: HistoryPoint[]
): number | null {
  if (prices.length < 2) return null;

  let peak = prices[0].close;
  let maxDraw = 0;

  for (const p of prices) {
    if (p.close > peak) peak = p.close;
    const draw = (p.close - peak) / peak;
    if (draw < maxDraw) maxDraw = draw;
  }

  return maxDraw === 0 ? null : maxDraw;
}

// ════════════════════════════════════════════════════════════════
// Scaling helpers
// ════════════════════════════════════════════════════════════════

/** Clamp a value to [min, max] */
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * Linear scale growth rate (decimal) to 0-100 score.
 * 0% → 20, 20%+ → 90, linearly interpolated, capped at [0, 100].
 */
function scaleGrowth(rate: number): number {
  // rate is a decimal: 0.15 = 15%
  const pct = rate * 100;
  if (pct <= 0) return clamp(20 + pct, 0, 20); // penalize negative
  if (pct >= 20) return clamp(90 + (pct - 20) * 0.5, 90, 100);
  // 0 → 20, 20 → 90: slope = 70/20 = 3.5
  return 20 + pct * 3.5;
}

// ════════════════════════════════════════════════════════════════
// Composite scores
// ════════════════════════════════════════════════════════════════

export function growthScore(data: CompanyData): GrowthScoreResult {
  const weights = { revYoY: 40, revCagr: 30, earnYoY: 30 };

  // Revenue growth YoY (from Yahoo financialData)
  const revYoY = data.growth.revenueGrowthYoY;
  const revYoYPts = revYoY != null ? scaleGrowth(revYoY) : null;

  // 3-year revenue CAGR from income statements
  const revenues = data.statements.income
    .map((s) => s.revenue)
    .filter((r): r is number => r != null && r > 0);
  const cagrYears = Math.max(revenues.length - 1, 1);
  const cagr3y = revenues.length >= 2 ? calculateCAGR(revenues, cagrYears) : null;
  const cagrPts = cagr3y != null ? scaleGrowth(cagr3y) : null;

  // Earnings growth YoY
  const earnYoY = data.growth.earningsGrowthYoY;
  const earnYoYPts = earnYoY != null ? scaleGrowth(earnYoY) : null;

  // Weighted average over available inputs
  let totalWeight = 0;
  let totalScore = 0;

  if (revYoYPts != null) {
    totalWeight += weights.revYoY;
    totalScore += revYoYPts * weights.revYoY;
  }
  if (cagrPts != null) {
    totalWeight += weights.revCagr;
    totalScore += cagrPts * weights.revCagr;
  }
  if (earnYoYPts != null) {
    totalWeight += weights.earnYoY;
    totalScore += earnYoYPts * weights.earnYoY;
  }

  const score = totalWeight > 0 ? Math.round(totalScore / totalWeight) : null;

  return {
    score,
    breakdown: {
      revenueGrowthYoY: { value: revYoY, points: revYoYPts != null ? Math.round(revYoYPts) : null },
      revenueCagr3y: { value: cagr3y, points: cagrPts != null ? Math.round(cagrPts) : null },
      earningsGrowthYoY: { value: earnYoY, points: earnYoYPts != null ? Math.round(earnYoYPts) : null },
      weightUsed: totalWeight,
    },
  };
}

export function riskScore(data: CompanyData): RiskScoreResult {
  const weights = { vol: 35, dte: 25, cr: 20, beta: 20 };

  // Volatility
  const vol = calculateVolatility(data.history);
  let volPts: number | null = null;
  if (vol != null) {
    if (vol < 0.2) volPts = 20;
    else if (vol < 0.4) volPts = 20 + ((vol - 0.2) / 0.2) * 30; // 20→50
    else volPts = 50 + Math.min((vol - 0.4) / 0.3, 1) * 35; // 50→85
  }

  // Debt-to-equity (Yahoo returns as percentage, e.g. 102.63 for 1.0263x)
  const dteRaw = data.balance.debtToEquity;
  const dte = dteRaw != null ? dteRaw / 100 : null; // normalize to ratio
  let dtePts: number | null = null;
  if (dte != null) {
    if (dte < 0.5) dtePts = 20;
    else if (dte < 1) dtePts = 20 + ((dte - 0.5) / 0.5) * 30; // 20→50
    else if (dte < 2) dtePts = 50 + ((dte - 1) / 1) * 20; // 50→70
    else dtePts = 70 + Math.min((dte - 2) / 2, 1) * 20; // 70→90
  }

  // Current ratio (inverted: lower = riskier)
  const cr = data.balance.currentRatio;
  let crPts: number | null = null;
  if (cr != null) {
    if (cr > 2) crPts = 20;
    else if (cr >= 1) crPts = 20 + ((2 - cr) / 1) * 30; // 20→50
    else crPts = 50 + ((1 - cr) / 1) * 40; // 50→90
  }

  // Beta deviation from 1
  const beta = data.beta;
  let betaPts: number | null = null;
  if (beta != null) {
    const dev = Math.abs(beta - 1);
    // dev 0 → 20, dev 1 → 70, dev 2+ → 90
    betaPts = 20 + Math.min(dev / 2, 1) * 70;
  }

  let totalWeight = 0;
  let totalScore = 0;

  if (volPts != null) {
    totalWeight += weights.vol;
    totalScore += volPts * weights.vol;
  }
  if (dtePts != null) {
    totalWeight += weights.dte;
    totalScore += dtePts * weights.dte;
  }
  if (crPts != null) {
    totalWeight += weights.cr;
    totalScore += crPts * weights.cr;
  }
  if (betaPts != null) {
    totalWeight += weights.beta;
    totalScore += betaPts * weights.beta;
  }

  const score = totalWeight > 0 ? Math.round(totalScore / totalWeight) : null;

  return {
    score,
    breakdown: {
      volatility: { value: vol, points: volPts != null ? Math.round(volPts) : null },
      debtToEquity: { value: dte, points: dtePts != null ? Math.round(dtePts) : null },
      currentRatio: { value: cr, points: crPts != null ? Math.round(crPts) : null },
      betaDeviation: {
        value: beta != null ? Math.abs(beta - 1) : null,
        points: betaPts != null ? Math.round(betaPts) : null,
      },
      weightUsed: totalWeight,
    },
  };
}

export function valuationScore(data: CompanyData): ValuationScoreResult {
  const weights = { pe: 30, peg: 25, pb: 20, ps: 25 };

  // P/E scoring: <15 → 15, 15-25 → linear 25-50, 25-40 → linear 50-75, >40 → 80+
  const pe = data.valuation.peRatio;
  let pePts: number | null = null;
  if (pe != null && pe > 0) {
    if (pe < 15) pePts = 10 + (pe / 15) * 15; // 10→25
    else if (pe < 25) pePts = 25 + ((pe - 15) / 10) * 25; // 25→50
    else if (pe < 40) pePts = 50 + ((pe - 25) / 15) * 25; // 50→75
    else pePts = 75 + Math.min((pe - 40) / 40, 1) * 25; // 75→100
  }

  // PEG scoring: <1 → 15-30, 1-2 → 30-60, >2 → 60+
  const peg = data.valuation.pegRatio;
  let pegPts: number | null = null;
  if (peg != null && peg > 0) {
    if (peg < 1) pegPts = 15 + (peg / 1) * 15; // 15→30
    else if (peg < 2) pegPts = 30 + ((peg - 1) / 1) * 30; // 30→60
    else pegPts = 60 + Math.min((peg - 2) / 2, 1) * 30; // 60→90
  }

  // P/B scoring: <1 → 10-25, 1-3 → 25-55, >3 → 55+
  const pb = data.valuation.priceToBook;
  let pbPts: number | null = null;
  if (pb != null && pb > 0) {
    if (pb < 1) pbPts = 10 + (pb / 1) * 15; // 10→25
    else if (pb < 3) pbPts = 25 + ((pb - 1) / 2) * 30; // 25→55
    else pbPts = 55 + Math.min((pb - 3) / 5, 1) * 35; // 55→90
  }

  // P/S scoring: <2 → 10-30, 2-5 → 30-60, >5 → 60+
  const ps = data.valuation.priceToSales;
  let psPts: number | null = null;
  if (ps != null && ps > 0) {
    if (ps < 2) psPts = 10 + (ps / 2) * 20; // 10→30
    else if (ps < 5) psPts = 30 + ((ps - 2) / 3) * 30; // 30→60
    else psPts = 60 + Math.min((ps - 5) / 10, 1) * 30; // 60→90
  }

  let totalWeight = 0;
  let totalScore = 0;

  if (pePts != null) {
    totalWeight += weights.pe;
    totalScore += pePts * weights.pe;
  }
  if (pegPts != null) {
    totalWeight += weights.peg;
    totalScore += pegPts * weights.peg;
  }
  if (pbPts != null) {
    totalWeight += weights.pb;
    totalScore += pbPts * weights.pb;
  }
  if (psPts != null) {
    totalWeight += weights.ps;
    totalScore += psPts * weights.ps;
  }

  const score = totalWeight > 0 ? Math.round(totalScore / totalWeight) : null;

  let label: ValuationLabel;
  if (score == null) label = "Insufficient Data";
  else if (score <= 20) label = "Deeply Undervalued";
  else if (score <= 35) label = "Undervalued";
  else if (score <= 55) label = "Fairly Valued";
  else if (score <= 75) label = "Overvalued";
  else label = "Significantly Overvalued";

  return {
    score,
    label,
    breakdown: {
      pe: { value: pe, points: pePts != null ? Math.round(pePts) : null },
      peg: { value: peg, points: pegPts != null ? Math.round(pegPts) : null },
      pb: { value: pb, points: pbPts != null ? Math.round(pbPts) : null },
      ps: { value: ps, points: psPts != null ? Math.round(psPts) : null },
      weightUsed: totalWeight,
    },
  };
}

export function verdict(
  growth: GrowthScoreResult,
  risk: RiskScoreResult,
  valuation: ValuationScoreResult
): VerdictResult {
  const g = growth.score;
  const r = risk.score;
  const v = valuation.score;

  const reasoning: string[] = [];
  let nullCount = 0;
  if (g == null) nullCount++;
  if (r == null) nullCount++;
  if (v == null) nullCount++;

  // Insufficient data → Watch with Low confidence
  if (nullCount >= 2) {
    reasoning.push(
      `${nullCount} of 3 analysis dimensions lack sufficient data for a confident call`
    );
    return { call: "Watch", confidence: "Low", reasoning };
  }

  // Classify bands
  const highGrowth = g != null && g >= 65;
  const medGrowth = g != null && g >= 40 && g < 65;
  const lowGrowth = g != null && g < 40;
  const highRisk = r != null && r >= 65;
  const medRisk = r != null && r >= 35 && r < 65;
  const lowRisk = r != null && r < 35;
  const overvalued = v != null && v >= 60;
  const fairValue = v != null && v >= 35 && v < 60;
  const undervalued = v != null && v < 35;

  // Build reasoning with actual numbers
  if (g != null) {
    const revG = growth.breakdown.revenueGrowthYoY.value;
    const revStr =
      revG != null ? `${(revG * 100).toFixed(1)}% YoY revenue growth` : "limited revenue data";
    reasoning.push(`Growth score ${g}/100 (${revStr})`);
  }
  if (r != null) {
    const vol = risk.breakdown.volatility.value;
    const volStr =
      vol != null ? `${(vol * 100).toFixed(1)}% annualized volatility` : "limited vol data";
    const dte = risk.breakdown.debtToEquity.value;
    const dteStr =
      dte != null ? `${dte.toFixed(2)}x debt/equity` : "D/E unavailable";
    reasoning.push(`Risk score ${r}/100 (${volStr}, ${dteStr})`);
  }
  if (v != null) {
    reasoning.push(
      `Valuation score ${v}/100 — "${valuation.label}"`
    );
  }

  // Decision matrix
  let call: VerdictResult["call"];
  let confidence: VerdictResult["confidence"];

  if (highRisk && overvalued) {
    call = "Avoid";
    confidence = lowGrowth ? "High" : "Medium";
    reasoning.push("High risk combined with overvaluation signals downside exposure");
  } else if (highRisk && !undervalued) {
    call = "Watch";
    confidence = "Medium";
    reasoning.push("Elevated risk warrants caution despite other signals");
  } else if (highGrowth && lowRisk && undervalued) {
    call = "Buy";
    confidence = "High";
    reasoning.push("Strong growth with contained risk and attractive valuation");
  } else if (highGrowth && (lowRisk || medRisk) && (fairValue || undervalued)) {
    call = "Buy";
    confidence = medRisk ? "Medium" : "High";
  } else if (highGrowth && overvalued) {
    call = "Hold";
    confidence = "Medium";
    reasoning.push("Growth is strong but current price already reflects it");
  } else if (medGrowth && lowRisk && undervalued) {
    call = "Buy";
    confidence = "Medium";
  } else if (medGrowth && medRisk && fairValue) {
    call = "Hold";
    confidence = "Medium";
  } else if (lowGrowth && undervalued && lowRisk) {
    call = "Hold";
    confidence = "Medium";
    reasoning.push("Low growth but attractive price and low risk — value play");
  } else if (lowGrowth && !undervalued) {
    call = "Watch";
    confidence = "Medium";
    reasoning.push("Weak growth without valuation discount to compensate");
  } else {
    call = "Hold";
    confidence = nullCount > 0 ? "Low" : "Medium";
  }

  // If any single score is null, cap confidence
  if (nullCount === 1 && confidence === "High") {
    confidence = "Medium";
  }

  return { call, confidence, reasoning };
}

// ════════════════════════════════════════════════════════════════
// Composite entry point
// ════════════════════════════════════════════════════════════════

export function runAnalysis(data: CompanyData): AnalysisResult {
  const g = growthScore(data);
  const r = riskScore(data);
  const v = valuationScore(data);
  const vd = verdict(g, r, v);

  // Derived metrics
  const revenues = data.statements.income
    .map((s) => s.revenue)
    .filter((r): r is number => r != null && r > 0);
  const cagrYears = Math.max(revenues.length - 1, 1);
  const cagr3y =
    revenues.length >= 2 ? calculateCAGR(revenues, cagrYears) : null;
  const vol = calculateVolatility(data.history);
  const maxDD = calculateDrawdown(data.history);

  return {
    growth: g,
    risk: r,
    valuation: v,
    verdict: vd,
    derived: { cagr3y, volatility: vol, maxDrawdown: maxDD },
  };
}
