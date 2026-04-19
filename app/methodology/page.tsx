import Link from "next/link";
import { ArrowLeft } from "lucide-react";

function Section({
  id,
  number,
  title,
  children,
}: {
  id: string;
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-8">
      <div className="mb-4 flex items-baseline gap-3">
        <span className="font-mono text-sm text-accent">{number}</span>
        <h2 className="text-xl font-semibold text-text">{title}</h2>
      </div>
      <div className="space-y-4 text-[15px] leading-7 text-text/85">
        {children}
      </div>
    </section>
  );
}

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-4 overflow-x-auto rounded-lg border border-border bg-surface px-5 py-3">
      <code className="font-mono text-sm text-accent">{children}</code>
    </div>
  );
}

function ThresholdTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="my-4 overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-surface">
            {headers.map((h) => (
              <th
                key={h}
                className="px-4 py-2 font-mono text-xs font-medium uppercase tracking-wider text-text-muted"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={i % 2 === 0 ? "bg-background" : "bg-surface"}
            >
              {row.map((cell, j) => (
                <td
                  key={j}
                  className="px-4 py-2 font-mono text-sm text-text/80"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MethodologyPage() {
  return (
    <div className="mx-auto w-full max-w-[720px] px-4 py-12">
      {/* Nav */}
      <Link
        href="/"
        className="mb-10 inline-flex items-center gap-2 text-sm text-text-muted transition-colors hover:text-accent"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Valora
      </Link>

      {/* Hero */}
      <div className="mb-16">
        <h1 className="text-3xl font-light tracking-[0.15em] text-text">
          How Valora Thinks
        </h1>
        <p className="mt-3 text-sm text-text-muted">
          Every score is deterministic. Every number comes from Yahoo Finance.
          The LLM writes prose — it never invents figures. This page documents
          exactly how each score is calculated so you can audit the logic
          yourself.
        </p>
      </div>

      <div className="space-y-14">
        {/* ──────────────────────────────────────────────────────── */}
        <Section id="data-sources" number="01" title="Data Sources">
          <p>
            All financial data comes from the{" "}
            <span className="font-medium text-text">Yahoo Finance API</span> via
            the <code className="font-mono text-xs text-accent">yahoo-finance2</code>{" "}
            library. No API key is required. Data is fetched on-demand when you
            enter a ticker — there is no cache or background sync.
          </p>

          <p>We pull from these Yahoo modules:</p>

          <ThresholdTable
            headers={["Module", "Data", "Notes"]}
            rows={[
              ["quoteSummary/price", "Current price, market cap, exchange", "Real-time during market hours"],
              ["quoteSummary/summaryDetail", "P/E, P/B, P/S, dividend yield, 52-week range", "Trailing twelve months"],
              ["quoteSummary/defaultKeyStatistics", "Beta, PEG ratio, forward P/E, EPS", "Updated quarterly"],
              ["quoteSummary/financialData", "Margins, ROE, ROA, D/E, revenue growth", "Most recent reported period"],
              ["quoteSummary/assetProfile", "Sector, industry, country, business description", "Relatively stable"],
              ["fundamentalsTimeSeries", "Income, balance sheet, cash flow (4 annual)", "Official filings, 1-2 quarter lag"],
              ["chart (1Y daily)", "250 daily closing prices", "Used for volatility and chart"],
            ]}
          />

          <p className="text-sm text-text-muted">
            Financial statements from <code className="font-mono text-xs">fundamentalsTimeSeries</code> reflect
            official SEC/SEBI filings. These typically lag the current quarter by
            1-2 quarters. If a company reported Q4 earnings last week, the most
            recent annual statement may still be the prior fiscal year.
          </p>
        </Section>

        {/* ──────────────────────────────────────────────────────── */}
        <Section id="growth-score" number="02" title="Growth Score">
          <p>
            Measures how fast the company is growing. Scored 0-100 as a weighted
            average of three components, re-weighted over whatever data is
            available.
          </p>

          <ThresholdTable
            headers={["Component", "Weight", "Source"]}
            rows={[
              ["Revenue Growth YoY", "40%", "financialData.revenueGrowth"],
              ["Revenue CAGR (3-year)", "30%", "Calculated from income statements"],
              ["Earnings Growth YoY", "30%", "financialData.earningsGrowth"],
            ]}
          />

          <p>Each component is scaled from the raw growth rate to a 0-100 score using this function:</p>

          <Formula>
            {"if rate <= 0%:  score = clamp(20 + rate, 0, 20)  // penalize negative growth"}<br />
            {"if 0% < rate < 20%:  score = 20 + (rate × 3.5)  // linear interpolation"}<br />
            {"if rate >= 20%:  score = clamp(90 + (rate - 20) × 0.5, 90, 100)"}
          </Formula>

          <ThresholdTable
            headers={["Growth Rate", "Points", "Interpretation"]}
            rows={[
              ["-20%", "0", "Severe decline"],
              ["-10%", "10", "Meaningful contraction"],
              ["0%", "20", "Flat"],
              ["5%", "38", "Modest"],
              ["10%", "55", "Healthy"],
              ["15%", "73", "Strong"],
              ["20%+", "90-100", "High growth"],
            ]}
          />

          <p>
            <span className="font-medium text-text">Worked example — AAPL:</span>{" "}
            Suppose Apple reports 15.7% YoY revenue growth, a 3-year revenue CAGR
            of 8.2%, and 18.3% earnings growth. The individual scores would be
            approximately 75, 49, and 84. Weighted:{" "}
            <code className="font-mono text-xs text-accent">
              (75 × 40 + 49 × 30 + 84 × 30) / 100 = 70
            </code>.
            Growth score: <span className="font-mono text-accent">70/100</span>.
          </p>

          <p className="text-sm text-text-muted">
            If a component is unavailable (null from Yahoo), its weight is
            redistributed to the remaining components. If all three are null, the
            growth score is null and marked "Insufficient Data."
          </p>
        </Section>

        {/* ──────────────────────────────────────────────────────── */}
        <Section id="risk-score" number="03" title="Risk Score">
          <p>
            Measures downside exposure. Scored 0-100, where{" "}
            <span className="font-medium text-text">100 = highest risk</span>.
            Four components:
          </p>

          <ThresholdTable
            headers={["Component", "Weight", "Source"]}
            rows={[
              ["Annualized Volatility", "35%", "Calculated from 1Y daily prices"],
              ["Debt-to-Equity", "25%", "financialData.debtToEquity / 100"],
              ["Current Ratio (inverted)", "20%", "financialData.currentRatio"],
              ["Beta Deviation from 1", "20%", "defaultKeyStatistics.beta"],
            ]}
          />

          <p className="font-medium text-text">Volatility calculation:</p>
          <Formula>
            {"daily_log_return[i] = ln(close[i] / close[i-1])"}<br />
            {"annualized_vol = std_dev(daily_log_returns) × sqrt(252)"}
          </Formula>

          <ThresholdTable
            headers={["Metric", "Low Risk (20 pts)", "Medium (50 pts)", "High Risk (85 pts)"]}
            rows={[
              ["Volatility", "< 20%", "20-40%", "> 40%"],
              ["Debt/Equity", "< 0.5x", "0.5-1.0x", "> 2.0x"],
              ["Current Ratio", "> 2.0", "1.0-2.0", "< 1.0"],
              ["Beta Deviation", "|beta - 1| ≈ 0", "|beta - 1| ≈ 0.5", "|beta - 1| ≥ 2"],
            ]}
          />

          <p className="text-sm text-text-muted">
            Note: Yahoo returns Debt-to-Equity as a percentage (e.g., 102.63
            meaning 1.03x). We divide by 100 before scoring. Beta deviation
            captures both high-beta (volatile) and negative-beta (inverse
            correlation) stocks.
          </p>
        </Section>

        {/* ──────────────────────────────────────────────────────── */}
        <Section id="valuation-score" number="04" title="Valuation Score">
          <p>
            Measures how expensive the stock is relative to fundamentals. Scored
            0-100, where{" "}
            <span className="font-medium text-text">100 = most overvalued</span>.
            Four multiples, each with independent thresholds:
          </p>

          <ThresholdTable
            headers={["Multiple", "Weight", "Cheap", "Fair", "Expensive"]}
            rows={[
              ["P/E Ratio", "30%", "< 15", "15-25", "> 40"],
              ["PEG Ratio", "25%", "< 1.0", "1.0-2.0", "> 2.0"],
              ["Price/Book", "20%", "< 1.0", "1.0-3.0", "> 3.0"],
              ["Price/Sales", "25%", "< 2.0", "2.0-5.0", "> 5.0"],
            ]}
          />

          <p>The composite score maps to a label:</p>

          <ThresholdTable
            headers={["Score Range", "Label"]}
            rows={[
              ["0-20", "Deeply Undervalued"],
              ["21-35", "Undervalued"],
              ["36-55", "Fairly Valued"],
              ["56-75", "Overvalued"],
              ["76-100", "Significantly Overvalued"],
            ]}
          />

          <p>
            <span className="font-medium text-text">Why these thresholds?</span>{" "}
            They represent broad market norms across sectors. A P/E under 15 is
            historically cheap for the S&P 500; a PEG under 1 suggests the market
            is underpricing the company&apos;s growth rate relative to its earnings
            multiple. Price/Book below 1 means the stock trades below liquidation
            value. These are starting points — see the Limitations section for
            important caveats about sector-specific norms.
          </p>
        </Section>

        {/* ──────────────────────────────────────────────────────── */}
        <Section id="verdict-matrix" number="05" title="Verdict Matrix">
          <p>
            The verdict is a deterministic function of the three scores. No
            randomness, no LLM involvement. The decision table:
          </p>

          <ThresholdTable
            headers={["Growth", "Risk", "Valuation", "Verdict", "Confidence"]}
            rows={[
              ["High (≥65)", "Low (<35)", "Undervalued (<35)", "Buy", "High"],
              ["High (≥65)", "Low/Med (<65)", "Fair/Under (<60)", "Buy", "Med-High"],
              ["High (≥65)", "Any", "Overvalued (≥60)", "Hold", "Medium"],
              ["Medium (40-64)", "Low (<35)", "Undervalued (<35)", "Buy", "Medium"],
              ["Medium (40-64)", "Medium (35-64)", "Fair (35-59)", "Hold", "Medium"],
              ["Low (<40)", "Low (<35)", "Undervalued (<35)", "Hold", "Medium"],
              ["Low (<40)", "Any", "Fair+ (≥35)", "Watch", "Medium"],
              ["Any", "High (≥65)", "Overvalued (≥60)", "Avoid", "Med-High"],
              ["Any", "High (≥65)", "Not undervalued", "Watch", "Medium"],
              ["2+ scores null", "—", "—", "Watch", "Low"],
            ]}
          />

          <p>Additional rules:</p>
          <ul className="list-inside list-disc space-y-1 text-sm text-text-muted">
            <li>
              If any single score is null, confidence is capped at Medium (never
              High).
            </li>
            <li>
              If 2+ scores are null, the verdict is always Watch with Low
              confidence.
            </li>
            <li>
              Reasoning strings always cite the actual computed numbers — e.g.,
              &ldquo;Growth score 70/100 (15.7% YoY revenue growth)&rdquo;.
            </li>
          </ul>
        </Section>

        {/* ──────────────────────────────────────────────────────── */}
        <Section id="memo-generation" number="06" title="Memo Generation">
          <p>
            The AI-written memo is generated by Claude (Sonnet 4.5) with a strict system
            prompt. The LLM receives the full{" "}
            <code className="font-mono text-xs text-accent">CompanyData</code> object
            and the computed{" "}
            <code className="font-mono text-xs text-accent">AnalysisResult</code> as
            locked context. Its hard rules include:
          </p>
          <ul className="list-inside list-disc space-y-1 text-sm text-text-muted">
            <li>Never invent, estimate, or approximate any number not in the data</li>
            <li>If a number is null, say the data is unavailable</li>
            <li>Quote exact values rounded to one decimal place</li>
            <li>No forward-looking price predictions</li>
            <li>No citing specific news events</li>
          </ul>
          <p>
            The response is validated with a Zod schema before rendering. If the
            LLM returns malformed JSON, we retry once. If it fails again, the
            memo section is hidden and all computed data/scores still render.
          </p>
        </Section>

        {/* ──────────────────────────────────────────────────────── */}
        <Section id="limitations" number="07" title="Limitations">
          <p>
            We believe in being explicit about what this tool does not do.
          </p>

          <ul className="space-y-3">
            <li className="rounded-lg border border-border bg-surface p-4">
              <p className="text-sm font-medium text-text">
                No sector-specific valuation norms
              </p>
              <p className="mt-1 text-sm text-text-muted">
                A utility trading at 18x earnings is expensive for its sector; a
                SaaS company at 40x may be fairly valued. Our thresholds are
                generic cross-market averages and do not adjust for industry
                norms.
              </p>
            </li>
            <li className="rounded-lg border border-border bg-surface p-4">
              <p className="text-sm font-medium text-text">
                Thresholds are not industry-adjusted
              </p>
              <p className="mt-1 text-sm text-text-muted">
                A 2x debt-to-equity ratio is normal for a bank but alarming for
                a tech company. The risk score treats all sectors the same. Use
                the breakdown tooltips to make your own judgment.
              </p>
            </li>
            <li className="rounded-lg border border-border bg-surface p-4">
              <p className="text-sm font-medium text-text">
                Financial statement reporting lag
              </p>
              <p className="mt-1 text-sm text-text-muted">
                Yahoo Finance sources financial statements from official filings
                (10-K, 20-F). These can lag the current quarter by 1-2 quarters.
                The income and cash flow data you see may not reflect the most
                recent earnings call.
              </p>
            </li>
            <li className="rounded-lg border border-border bg-surface p-4">
              <p className="text-sm font-medium text-text">
                No qualitative analysis
              </p>
              <p className="mt-1 text-sm text-text-muted">
                Management quality, competitive moats, regulatory environment,
                pending litigation, and macro conditions are not factored into
                the scores. The AI memo may reference the sector context but does
                not have access to news, analyst reports, or proprietary data.
              </p>
            </li>
            <li className="rounded-lg border border-border bg-surface p-4">
              <p className="text-sm font-medium text-text">
                This is a research tool, not investment advice
              </p>
              <p className="mt-1 text-sm text-text-muted">
                Valora is designed to accelerate initial due diligence, not
                replace it. The verdict is a starting point for further research,
                not a recommendation to trade.
              </p>
            </li>
          </ul>
        </Section>
      </div>

      {/* Disclaimer footer */}
      <div className="mt-16 border-t border-border pt-6">
        <p className="text-center text-xs text-text-muted">
          Valora outputs are for educational purposes. Not a solicitation to buy
          or sell securities. Do your own research.
        </p>
      </div>
    </div>
  );
}
