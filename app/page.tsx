import SearchBar from "@/components/SearchBar";
import CursorRipple from "@/components/CursorRipple";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4">
      <CursorRipple />
      <div className="flex w-full max-w-lg flex-col items-center text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/valora-lockup.png"
          alt="Valora"
          className="h-[180px] w-auto object-contain max-sm:h-[120px]"
          style={{
            filter: "drop-shadow(0 8px 32px rgba(232, 168, 124, 0.15))",
          }}
        />
        <p className="mt-3 text-sm text-text-muted">
          Investment memos, grounded in real data
        </p>

        <div className="mt-12 w-full">
          <SearchBar />
        </div>

        <p className="mt-3 text-center text-[11px] text-accent/40">
          Search any global ticker &mdash; US, India, UK, Japan, Europe. Try
          &lsquo;tata&rsquo; or &lsquo;colgate india&rsquo;.
        </p>

        <p className="mt-8 font-mono text-xs text-text-muted">
          Powered by Yahoo Finance &middot; Analysis by Gemini
        </p>
      </div>
    </div>
  );
}
