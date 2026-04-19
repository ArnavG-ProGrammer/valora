import type { VerdictResult } from "@/lib/types";

const callColors: Record<VerdictResult["call"], string> = {
  Buy: "text-success",
  Hold: "text-warning",
  Watch: "text-watch",
  Avoid: "text-danger",
};

const callBorderAccent: Record<VerdictResult["call"], string> = {
  Buy: "rgba(124, 232, 168, 0.2)",
  Hold: "rgba(232, 212, 124, 0.2)",
  Watch: "rgba(232, 168, 124, 0.2)",
  Avoid: "rgba(232, 124, 124, 0.2)",
};

const confidenceBg: Record<VerdictResult["confidence"], string> = {
  High: "bg-success/15 text-success",
  Medium: "bg-warning/15 text-warning",
  Low: "bg-text-muted/15 text-text-muted",
};

export default function Verdict({ verdict }: { verdict: VerdictResult }) {
  return (
    <div
      className="glass-card p-6"
      style={{ borderColor: callBorderAccent[verdict.call] }}
    >
      <div className="relative z-10 flex items-center gap-4">
        <span
          className={`font-mono text-4xl font-bold ${callColors[verdict.call]}`}
        >
          {verdict.call}
        </span>
        <span
          className={`rounded-full px-3 py-0.5 text-xs font-medium ${confidenceBg[verdict.confidence]}`}
        >
          {verdict.confidence} Confidence
        </span>
      </div>

      {verdict.reasoning.length > 0 && (
        <ul className="relative z-10 mt-4 space-y-1.5">
          {verdict.reasoning.map((r, i) => (
            <li key={i} className="flex gap-2 text-sm text-text-muted">
              <span className="shrink-0 text-text-muted">•</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
