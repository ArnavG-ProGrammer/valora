import type { Memo } from "@/lib/ai/generateMemo";

const SECTIONS: { key: keyof Memo; title: string }[] = [
  { key: "overview", title: "Overview" },
  { key: "businessModel", title: "Business Model" },
  { key: "financialSummary", title: "Financial Summary" },
  { key: "risks", title: "Risks" },
  { key: "opportunities", title: "Opportunities" },
  { key: "verdictNarrative", title: "Verdict" },
];

export default function MemoSection({ memo }: { memo: Memo }) {
  return (
    <div className="mx-auto max-w-[680px]">
      {SECTIONS.map(({ key, title }, i) => (
        <div key={key}>
          {i > 0 && <hr className="my-6 border-border" />}
          <h3 className="mb-3 text-xs font-medium uppercase tracking-[0.15em] text-text-muted">
            {title}
          </h3>
          <p className="text-[15px] leading-7 text-text">{memo[key]}</p>
        </div>
      ))}
    </div>
  );
}
