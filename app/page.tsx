import SearchBar from "@/components/SearchBar";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4">
      <div className="flex w-full max-w-lg flex-col items-center text-center">
        <h1 className="text-5xl font-light tracking-[0.2em] text-text">
          VALORA
        </h1>
        <p className="mt-3 text-sm text-text-muted">
          Investment memos, grounded in real data
        </p>

        <div className="mt-12 w-full">
          <SearchBar />
        </div>

        <p className="mt-10 font-mono text-xs text-text-muted">
          Powered by Yahoo Finance &middot; Analysis by Claude
        </p>
      </div>
    </div>
  );
}
