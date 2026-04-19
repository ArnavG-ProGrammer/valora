# Valora — Investment Memo Engine

AI-generated investment memos backed by real financial data. Zero hallucinated numbers.

## What It Does

Enter a ticker symbol and Valora produces a structured investment memo:

1. **Fetches real data** from Yahoo Finance (price, financials, balance sheet, cash flow)
2. **Runs deterministic analysis** — growth score, risk score, valuation score, and a Buy/Hold/Watch/Avoid verdict. Pure math, no LLM involved
3. **Generates prose** — Claude writes the memo narrative around pre-computed, locked numbers
4. **Validates output** — Zod schema ensures the LLM response is structurally correct

The LLM never invents a number. Every figure in the memo traces back to Yahoo Finance data or deterministic calculations.

## Run Locally

```bash
git clone https://github.com/your-username/valora.git
cd valora
npm install
cp .env.example .env.local
# Add your Anthropic API key to .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GOOGLE_API_KEY` | Yes | Google AI API key for memo generation |

## Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Data**: yahoo-finance2
- **AI**: Google Gemini (gemini-2.0-flash)
- **Validation**: Zod v4
- **Charts**: Recharts
- **Testing**: Vitest

## Scripts

```bash
npm run dev        # Start dev server
npm run build      # Production build
npm run test       # Run tests
npm run lint       # Run ESLint
```

## Limitations

- Financial data comes from Yahoo Finance and may have delays or gaps, especially for non-US equities
- The scoring model is opinionated and simplified — it is not investment advice
- Rate limited to 10 memo requests per minute per IP
- Indian stocks use `.NS` suffix (e.g., `RELIANCE.NS`)
- Historical financial statements depend on Yahoo's `fundamentalsTimeSeries` API availability

## License

MIT
