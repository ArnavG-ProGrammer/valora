import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import type { CompanyData, AnalysisResult } from "@/lib/types";

// ── Memo schema (zod validates LLM output) ─────────────────────
const MemoSchema = z.object({
  overview: z.string(),
  businessModel: z.string(),
  financialSummary: z.string(),
  risks: z.string(),
  opportunities: z.string(),
  verdictNarrative: z.string(),
});

export type Memo = z.infer<typeof MemoSchema>;

// ── System prompt: hard rules for the LLM ──────────────────────
const SYSTEM_PROMPT = `You are a financial analyst writing a short investment memo. You have been given verified financial data and pre-computed analytical scores. Your job is to write clear, professional prose that references these exact numbers.

HARD RULES:
- Never invent, estimate, or approximate any number not in the provided data
- If a number is null or missing, write around it or say the data is unavailable
- Quote revenue, margins, ratios, and percentages using the exact values given, rounded to one decimal place
- Use the provided scores as-is in verdict reasoning
- Do not add forward-looking price predictions
- Do not cite specific news events unless provided
- Write in clean, punchy, banking-desk prose. No filler. No hedging adverbs like "potentially" or "arguably" unless genuinely warranted
- Return valid JSON matching the Memo schema. No markdown, no code fences

The JSON schema you must return:
{
  "overview": "2-3 sentences on what the company does, sourced from the business summary",
  "businessModel": "2-3 sentences on how they make money, must reference sector/industry",
  "financialSummary": "3-4 sentences referencing real revenue, margin, growth numbers",
  "risks": "3-4 sentences pulling from risk score breakdown",
  "opportunities": "3-4 sentences from growth score breakdown and industry context",
  "verdictNarrative": "2-3 sentences explaining the verdict using actual scores"
}`;

// ── Client (reads GOOGLE_API_KEY from env) ─────────────────────
if (!process.env.GOOGLE_API_KEY) {
  throw new Error(
    "Missing GOOGLE_API_KEY environment variable. Add it to .env.local or your Vercel project settings."
  );
}
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

function buildUserMessage(data: CompanyData, analysis: AnalysisResult): string {
  // Strip history array to save tokens — the LLM doesn't need 250 daily prices
  const trimmedData = {
    ...data,
    history: `[${data.history.length} daily price points omitted for brevity]`,
  };

  return `COMPANY DATA:
${JSON.stringify(trimmedData, null, 2)}

COMPUTED ANALYSIS:
${JSON.stringify(analysis, null, 2)}

Write the memo now. Return ONLY the JSON object.`;
}

function extractJSON(text: string): unknown {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // Strip markdown code fences if the model wrapped it
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      return JSON.parse(fenceMatch[1].trim());
    }
    throw new Error("Failed to parse JSON from model response");
  }
}

export async function generateMemo(
  data: CompanyData,
  analysis: AnalysisResult
): Promise<Memo> {
  const userMessage = buildUserMessage(data, analysis);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: SYSTEM_PROMPT,
  });

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const prompt =
      attempt === 0
        ? userMessage
        : `${userMessage}\n\nIMPORTANT: Return ONLY valid JSON matching the schema. No markdown, no explanation, no code fences. Just the raw JSON object.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    if (!text) {
      lastError = new Error("No text content in model response");
      continue;
    }

    try {
      const parsed = extractJSON(text);
      const memo = MemoSchema.parse(parsed);
      return memo;
    } catch (err) {
      lastError =
        err instanceof Error ? err : new Error("Unknown parse error");
    }
  }

  throw new Error(
    `Failed to generate valid memo after 2 attempts: ${lastError?.message}`
  );
}
