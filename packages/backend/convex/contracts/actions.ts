"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";

// ---------------------------------------------------------------------------
// extractContractData — AI extraction pipeline (Story 6.1)
// ---------------------------------------------------------------------------

/**
 * Internal action that extracts structured data from a contract PDF.
 *
 * When OPENAI_API_KEY is set, sends the PDF to OpenAI GPT-4o for real
 * extraction. Otherwise, returns mock data so the full flow can be tested
 * without an API key.
 *
 * Scheduled from uploadContract mutation via ctx.scheduler.runAfter(0, ...).
 */
export const extractContractData = internalAction({
  args: {
    contractId: v.id("contracts"),
  },
  returns: v.null(),
  handler: async (ctx, { contractId }) => {
    // 1. Mark as processing
    await ctx.runMutation(
      internal.contracts.internalMutations.updateExtractionResult,
      {
        contractId,
        status: "processing",
      },
    );

    try {
      // 2. Fetch the contract record to get fileId
      const contract = await ctx.runQuery(
        internal.contracts.internalQueries.getContractById,
        { contractId },
      );

      if (!contract) {
        throw new Error("Contract record not found");
      }

      // 3. Fetch PDF bytes from storage (validate file exists)
      const blob = await ctx.storage.get(contract.fileId);
      if (!blob) {
        throw new Error("Contract PDF file not found in storage");
      }

      let extractedData: Record<string, string | undefined>;

      const openaiApiKey = process.env.OPENAI_API_KEY;

      if (openaiApiKey) {
        // ---- Real extraction via OpenAI ----
        extractedData = await extractWithOpenAI(blob, openaiApiKey);
      } else {
        // ---- Mock extraction for testing ----
        console.log("[extractContractData] No OPENAI_API_KEY — using mock data");
        // Simulate processing delay
        await new Promise((resolve) => setTimeout(resolve, 2000));
        extractedData = {
          salary: "€1,200,000/year (net)",
          bonuses: "€200,000 appearance bonus (25+ matches), €150,000 Champions League qualification bonus",
          clauses: "Release clause: €15,000,000. Loan clause: mutual consent required. Image rights: 80% player / 20% club",
          duration: "1 July 2025 — 30 June 2028 (3 years)",
          terminationTerms: "Either party may terminate with 6 months written notice. Immediate termination for material breach or doping violation.",
          governingLaw: "Italian law (FIGC regulations). Disputes resolved by the Camera Arbitrale del Calcio.",
        };
      }

      // 4. Save success
      await ctx.runMutation(
        internal.contracts.internalMutations.updateExtractionResult,
        {
          contractId,
          status: "completed",
          extractedData,
        },
      );
    } catch (error) {
      // 5. Save failure
      const message =
        error instanceof Error ? error.message : "Unknown extraction error";

      console.error(
        `[extractContractData] Failed for ${contractId}:`,
        message,
      );

      await ctx.runMutation(
        internal.contracts.internalMutations.updateExtractionResult,
        {
          contractId,
          status: "failed",
          extractionError: message,
        },
      );
    }

    return null;
  },
});

// ---------------------------------------------------------------------------
// OpenAI extraction helper
// ---------------------------------------------------------------------------

async function extractWithOpenAI(
  blob: Blob,
  apiKey: string,
): Promise<Record<string, string | undefined>> {
  // Dynamic import to avoid bundling OpenAI when not needed
  const { default: OpenAI } = await import("openai");

  const arrayBuffer = await blob.arrayBuffer();
  const base64Pdf = Buffer.from(arrayBuffer).toString("base64");

  const openai = new OpenAI({ apiKey });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await openai.chat.completions.create(
      {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a contract analysis assistant for a football (soccer) operations platform. Extract structured data from player contracts. Return a JSON object with the following fields. If a field is not found in the contract, return null for that field.

Fields:
- salary: The player's salary (include currency and period, e.g. "€1,200,000/year")
- bonuses: Any bonuses, incentives, or performance-based compensation
- clauses: Key contractual clauses (buyout clause, release clause, loan clause, etc.)
- duration: Contract duration (start date, end date, and/or total length)
- terminationTerms: Conditions under which the contract can be terminated early
- governingLaw: The jurisdiction or governing law of the contract`,
          },
          {
            role: "user",
            content: [
              {
                type: "file",
                file: {
                  filename: "contract.pdf",
                  file_data: `data:application/pdf;base64,${base64Pdf}`,
                },
              },
              {
                type: "text",
                text: "Extract the key fields from this player contract PDF.",
              },
            ],
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "contract_extraction",
            strict: true,
            schema: {
              type: "object",
              properties: {
                salary: { type: ["string", "null"] },
                bonuses: { type: ["string", "null"] },
                clauses: { type: ["string", "null"] },
                duration: { type: ["string", "null"] },
                terminationTerms: { type: ["string", "null"] },
                governingLaw: { type: ["string", "null"] },
              },
              required: [
                "salary",
                "bonuses",
                "clauses",
                "duration",
                "terminationTerms",
                "governingLaw",
              ],
              additionalProperties: false,
            },
          },
        },
        temperature: 0.1,
      },
      { signal: controller.signal },
    );

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI returned an empty response");
    }

    const parsed = JSON.parse(content) as Record<string, string | null>;

    const extractedData: Record<string, string | undefined> = {};
    for (const key of [
      "salary",
      "bonuses",
      "clauses",
      "duration",
      "terminationTerms",
      "governingLaw",
    ] as const) {
      if (parsed[key] != null && parsed[key] !== "") {
        extractedData[key] = parsed[key];
      }
    }

    return extractedData;
  } finally {
    clearTimeout(timeout);
  }
}
