"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import type { GrowthScoreResult, RiskScoreResult, ValuationScoreResult } from "@/lib/types";

function scoreLabel(type: "growth" | "risk" | "valuation", score: number | null): string {
  if (score == null) return "Insufficient Data";
  if (type === "growth") {
    if (score >= 70) return "High Growth";
    if (score >= 45) return "Moderate Growth";
    return "Low Growth";
  }
  if (type === "risk") {
    if (score >= 65) return "High Risk";
    if (score >= 35) return "Moderate Risk";
    return "Low Risk";
  }
  // valuation
  if (score <= 25) return "Undervalued";
  if (score <= 50) return "Fairly Valued";
  if (score <= 75) return "Overvalued";
  return "Very Expensive";
}

function barColor(type: "growth" | "risk" | "valuation", score: number): string {
  if (type === "growth") {
    if (score >= 70) return "bg-success";
    if (score >= 45) return "bg-accent";
    return "bg-text-muted";
  }
  if (type === "risk") {
    if (score >= 65) return "bg-danger";
    if (score >= 35) return "bg-warning";
    return "bg-success";
  }
  // valuation: low = green (cheap), high = red (expensive)
  if (score <= 30) return "bg-success";
  if (score <= 55) return "bg-accent";
  return "bg-danger";
}

function fmtBreakdown(key: string, v: { value: number | null; points: number | null }): string {
  if (v.value == null) return `${key}: unavailable`;
  const valStr =
    Math.abs(v.value) < 1
      ? `${(v.value * 100).toFixed(1)}%`
      : v.value.toFixed(2);
  return `${key}: ${valStr} → ${v.points ?? "—"} pts`;
}

function ScoreCard({
  title,
  type,
  score,
  breakdownLines,
}: {
  title: string;
  type: "growth" | "risk" | "valuation";
  score: number | null;
  breakdownLines: string[];
}) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const label = scoreLabel(type, score);

  return (
    <div className="relative rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-text-muted">
          {title}
        </p>
        <button
          onMouseEnter={() => setShowBreakdown(true)}
          onMouseLeave={() => setShowBreakdown(false)}
          onClick={() => setShowBreakdown((p) => !p)}
          className="text-text-muted transition-colors hover:text-accent"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </div>

      <p className="mt-2 font-mono text-3xl font-semibold text-text">
        {score != null ? score : "—"}
        <span className="text-base text-text-muted">/100</span>
      </p>

      {/* Bar */}
      <div className="mt-2 h-1.5 w-full rounded-full bg-surface-light">
        {score != null && (
          <div
            className={`h-full rounded-full ${barColor(type, score)}`}
            style={{ width: `${score}%` }}
          />
        )}
      </div>

      <p className="mt-2 text-xs text-text-muted">{label}</p>

      {/* Breakdown tooltip */}
      {showBreakdown && breakdownLines.length > 0 && (
        <div className="absolute left-0 top-full z-10 mt-1 w-full rounded-lg border border-border bg-surface-light p-3 shadow-xl">
          {breakdownLines.map((line, i) => (
            <p key={i} className="font-mono text-xs text-text-muted">
              {line}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ScoreCards({
  growth,
  risk,
  valuation,
}: {
  growth: GrowthScoreResult;
  risk: RiskScoreResult;
  valuation: ValuationScoreResult;
}) {
  const growthLines = [
    fmtBreakdown("Rev YoY", growth.breakdown.revenueGrowthYoY),
    fmtBreakdown("Rev CAGR 3Y", growth.breakdown.revenueCagr3y),
    fmtBreakdown("Earnings YoY", growth.breakdown.earningsGrowthYoY),
  ];

  const riskLines = [
    fmtBreakdown("Volatility", risk.breakdown.volatility),
    fmtBreakdown("Debt/Equity", risk.breakdown.debtToEquity),
    fmtBreakdown("Current Ratio", risk.breakdown.currentRatio),
    fmtBreakdown("Beta Dev", risk.breakdown.betaDeviation),
  ];

  const valLines = [
    fmtBreakdown("P/E", valuation.breakdown.pe),
    fmtBreakdown("PEG", valuation.breakdown.peg),
    fmtBreakdown("P/B", valuation.breakdown.pb),
    fmtBreakdown("P/S", valuation.breakdown.ps),
  ];

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <ScoreCard
        title="Growth"
        type="growth"
        score={growth.score}
        breakdownLines={growthLines}
      />
      <ScoreCard
        title="Risk"
        type="risk"
        score={risk.score}
        breakdownLines={riskLines}
      />
      <ScoreCard
        title="Valuation"
        type="valuation"
        score={valuation.score}
        breakdownLines={valLines}
      />
    </div>
  );
}
