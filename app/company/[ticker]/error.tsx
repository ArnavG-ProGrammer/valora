"use client";

import Link from "next/link";
import { ArrowLeft, RotateCcw } from "lucide-react";

export default function CompanyError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const message = error.message.toLowerCase();

  let title: string;
  let description: string;
  let showRetry = true;

  if (message.includes("not found") || message.includes("no data")) {
    title = "Ticker Not Found";
    description =
      "We couldn't find that ticker. Try an exchange suffix like .NS for Indian stocks or check the spelling.";
    showRetry = false;
  } else if (
    message.includes("rate limit") ||
    message.includes("throttl") ||
    message.includes("429")
  ) {
    title = "Rate Limited";
    description =
      "Yahoo Finance is temporarily throttling requests. Give it a minute and retry.";
  } else {
    title = "Something Went Wrong";
    description =
      "Something broke on our end. The engineering team has been notified.";
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col items-center px-4 py-24 text-center">
      <p className="text-lg font-medium text-danger">{title}</p>
      <p className="mt-2 max-w-md text-sm text-text-muted">{description}</p>
      <div className="mt-6 flex gap-4">
        {showRetry && (
          <button
            onClick={reset}
            className="flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2 text-sm text-accent transition-colors hover:bg-surface-light"
          >
            <RotateCcw className="h-4 w-4" />
            Retry
          </button>
        )}
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2 text-sm text-text-muted transition-colors hover:bg-surface-light"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to search
        </Link>
      </div>
    </div>
  );
}
