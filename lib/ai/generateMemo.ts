import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { z } from "zod";
import type { CompanyData, AnalysisResult } from "@/lib/types";
import { RateLimitError } from "@/lib/types";

// ── Memo schema (zod validates LLM output as final guard) ─────
const MemoSchema = z.object({
  overview: z.string(),
  businessModel: z.string(),
  financialSummary: z.string(),
  risks: z.string(),
  opportunities: z.string(),
  verdictNarrative: z.string(),
});

export type Memo = z.infer<typeof MemoSchema>;

// ── Gemini response schema (structured output, no fences) ─────
const memoResponseSchema = {
  type: SchemaType.OBJECT as const,
  properties: {
    overview: {
      type: SchemaType.STRING as const,
      description:
        "2-3 sentences on what the company does, sourced from the business summary",
    },
    businessModel: {
      type: SchemaType.STRING as const,
      description:
        "2-3 sentences on how they make money, must reference sector/industry",
    },
    financialSummary: {
      type: SchemaType.STRING as const,
      description:
        "3-4 sentences referencing real revenue, margin, growth numbers",
    },
    risks: {
      type: SchemaType.STRING as const,
      description: "3-4 sentences pulling from risk score breakdown",
    },
    opportunities: {
      type: SchemaType.STRING as const,
      description:
        "3-4 sentences from growth score breakdown and industry context",
    },
    verdictNarrative: {
      type: SchemaType.STRING as const,
      description:
        "2-3 sentences explaining the verdict using actual scores",
    },
  },
  required: [
    "overview",
    "businessModel",
    "financialSummary",
    "risks",
    "opportunities",
    "verdictNarrative",
  ],
};

// ── System prompt: hard rules for the LLM ─────────────────────
const SYSTEM_PROMPT = `You are a financial analyst writing a short investment memo. You have been given verified financial data and pre-computed analytical scores. Your job is to write clear, professional prose that references these exact numbers.

HARD RULES:
- Never invent, estimate, or approximate any number not in the provided data
- If a number is null or missing, write around it or say the data is unavailable
- Quote revenue, margins, ratios, and percentages using the exact values given, rounded to one decimal place
- Use the provided scores as-is in verdict reasoning
- Do not add forward-looking price predictions
- Do not cite specific news events unless provided
- Write in clean, punchy, banking-desk prose. No filler. No hedging adverbs like "potentially" or "arguably" unless genuinely warranted
- Return valid JSON matching the Memo schema`;

// ── Client (reads GEMINI_API_KEY from env, lazy init) ─────────
// Lazy to avoid build-time crash on Vercel (env vars only available at runtime)
let _genAI: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!_genAI) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error(
        "Missing GEMINI_API_KEY environment variable. Add it to .env.local or your Vercel project settings."
      );
    }
    _genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return _genAI;
}

function buildUserMessage(
  data: CompanyData,
  analysis: AnalysisResult
): string {
  // Strip history array to save tokens — the LLM doesn't need 250 daily prices
  const trimmedData = {
    ...data,
    history: `[${data.history.length} daily price points omitted for brevity]`,
  };

  return `COMPANY DATA:
${JSON.stringify(trimmedData, null, 2)}

COMPUTED ANALYSIS:
${JSON.stringify(analysis, null, 2)}

Write the memo now.`;
}

function isGeminiRateLimit(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return msg.includes("429") || msg.includes("resource has been exhausted");
  }
  return false;
}

export async function generateMemo(
  data: CompanyData,
  analysis: AnalysisResult
): Promise<Memo> {
  const userMessage = buildUserMessage(data, analysis);

  const model = getClient().getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: memoResponseSchema,
      temperature: 0.3,
      maxOutputTokens: 2048,
    },
  });

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const prompt =
      attempt === 0
        ? userMessage
        : `${userMessage}\n\nYour previous response was not valid JSON. Return only the JSON object, no markdown, no fences.`;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      if (!text) {
        lastError = new Error("No text content in model response");
        continue;
      }

      const parsed = JSON.parse(text);
      const memo = MemoSchema.parse(parsed);
      return memo;
    } catch (err) {
      // Surface Gemini rate limits (15 req/min, 1500/day on free tier)
      if (isGeminiRateLimit(err)) {
        throw new RateLimitError();
      }
      lastError =
        err instanceof Error ? err : new Error("Unknown parse error");
    }
  }

  throw new Error(
    `Failed to generate valid memo after 2 attempts: ${lastError?.message}`
  );
}
