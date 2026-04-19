import type { VerdictResult } from "@/lib/types";

const callColors: Record<VerdictResult["call"], string> = {
  Buy: "text-success",
  Hold: "text-warning",
  Watch: "text-watch",
  Avoid: "text-danger",
};

const callBorderColors: Record<VerdictResult["call"], string> = {
  Buy: "border-success",
  Hold: "border-warning",
  Watch: "border-watch",
  Avoid: "border-danger",
};

const confidenceBg: Record<VerdictResult["confidence"], string> = {
  High: "bg-success/15 text-success",
  Medium: "bg-warning/15 text-warning",
  Low: "bg-text-muted/15 text-text-muted",
};

export default function Verdict({ verdict }: { verdict: VerdictResult }) {
  return (
    <div
      className={`rounded-lg border bg-surface p-6 ${callBorderColors[verdict.call]}`}
    >
      <div className="flex items-center gap-4">
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
        <ul className="mt-4 space-y-1.5">
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
