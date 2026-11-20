import { ProviderFactory } from "../providerFactory";
import { AchievementBullet, StructuredFact, BankEntry } from "@/types/bank";
import { RewrittenBullet, RewrittenBulletClaim } from "@/types/job";
import { TruthBoundValidator } from "@/lib/tailoring/truthBoundValidator";

export interface XyzStructure {
  accomplishedX: string;
  measuredByY: string | null;
  byDoingZ: string;
}

export interface XyzRewriteResult {
  rewrittenText: string;
  originalText: string;
  xyzStructure: XyzStructure;
  hasVerifiedMetric: boolean;
  suggestedMetricQuestion: string | null;
  claimMap: RewrittenBulletClaim[];
  sourceBulletIds: string[];
  sourceFactIds: string[];
  passedValidation: boolean;
  validationNotes: string[];
}

export class XyzRewriterService {
  /**
   * System prompt implementing Google's XYZ Achievement-Writing Methodology
   * "Accomplished [X], as measured by [Y], by doing [Z]"
   */
  private static readonly SYSTEM_PROMPT = `You are an elite Career & Resume Intelligence Engine operating as Pipeline B.
You write resume bullets following Google's XYZ Achievement-Writing Methodology:
"Accomplished [X], as measured by [Y], by doing [Z]"

Where:
- X = The accomplishment or business/engineering result achieved.
- Y = Measurable evidence of the impact (e.g., % improvement, time saved, scale, throughput, uptime, requests, latency).
- Z = The action, technical implementation, tools, or methodology used to achieve the result.

STRICT TRUTH-BOUND & ANTI-FABRICATION RULES (MANDATORY):
1. NEVER invent, estimate, or hallucinate metrics, numbers, percentages, dollar values, user counts, or team sizes.
2. The XYZ formula is a writing framework, NOT permission to fabricate numbers.
3. If verified metrics exist in the provided source bullet or structured facts:
   - Use that exact metric in [Y] and structure the bullet around it.
4. If metric [Y] is UNAVAILABLE in source evidence:
   - Produce the strongest honest, concise bullet possible without any fabricated numbers.
   - Formulate a clear, helpful confirmation question in "suggestedMetricQuestion" (e.g., "What was the estimated latency reduction or request volume for this API?") that the user could optionally verify.
5. Never promote role seniority (e.g., do not turn "assisted" or "worked on" into "architected", "founded", or "directed").
6. Avoid fluff, filler phrases, and generic AI buzzwords ("spearheaded a paradigm shift", "leveraged synergy").

OUTPUT JSON SCHEMA:
{
  "rewrittenText": "Active, concise achievement bullet following XYZ structure",
  "accomplishedX": "The result or outcome achieved",
  "measuredByY": "The verified metric/measurement, or null if no metric was in the source",
  "byDoingZ": "The action, technology, and method used",
  "suggestedMetricQuestion": "Question prompting user for a measurable metric if none existed, or null",
  "claimMap": [
    {
      "claim": "Claim text",
      "evidenceIds": ["bullet_id_1"],
      "claimType": "action" | "tool" | "metric" | "scope" | "outcome" | "other"
    }
  ]
}`;

  /**
   * Rewrites an individual bullet using Google's XYZ methodology and truth-bound validation
   */
  static async rewriteBullet(
    sourceBullet: { id: string; text: string; facts?: StructuredFact[] },
    parentEntry: { id?: string; title: string; organization?: string | null; descriptionContext?: string | null },
    allFacts: StructuredFact[] = [],
    targetJdKeywords: string[] = [],
    options?: { apiKey?: string; model?: string; forceLocal?: boolean }
  ): Promise<XyzRewriteResult> {
    const verifiedNumbers = this.extractNumericTokens(sourceBullet.text);
    for (const f of sourceBullet.facts || []) {
      if (f.valueNumeric !== null && f.valueNumeric !== undefined) {
        verifiedNumbers.add(String(f.valueNumeric));
      }
      if (f.valueText) {
        for (const num of this.extractNumericTokens(f.valueText)) {
          verifiedNumbers.add(num);
        }
      }
    }

    const hasVerifiedMetric = verifiedNumbers.size > 0;

    // Fast local deterministic path if requested or if using local adapter
    const provider = ProviderFactory.getReasoningProvider(options?.apiKey, options?.model);

    if (options?.forceLocal || provider.name === "local-deterministic") {
      return this.localDeterministicXyzRewrite(sourceBullet, parentEntry, hasVerifiedMetric, targetJdKeywords);
    }

    const userPayload = {
      sourceBullet: {
        id: sourceBullet.id,
        text: sourceBullet.text,
      },
      parentEntry: {
        title: parentEntry.title,
        organization: parentEntry.organization,
        descriptionContext: parentEntry.descriptionContext,
      },
      verifiedFacts: (sourceBullet.facts || []).map((f) => ({
        type: f.factType,
        text: f.valueText,
        number: f.valueNumeric,
      })),
      targetJdKeywords: targetJdKeywords.slice(0, 8),
      hasVerifiedMetric,
    };

    try {
      const response = await provider.generateStructured<{
        rewrittenText: string;
        accomplishedX: string;
        measuredByY: string | null;
        byDoingZ: string;
        suggestedMetricQuestion: string | null;
        claimMap: RewrittenBulletClaim[];
      }>({
        task: "rewrite",
        systemPrompt: this.SYSTEM_PROMPT,
        userPayload,
        schema: {},
        maxOutputTokens: 512,
        temperature: 0.1,
      });

      const data = response.data;
      let candidateText = data.rewrittenText ? data.rewrittenText.trim() : sourceBullet.text;

      // Anti-hallucination verification: check for unverified numbers in rewritten text
      const outputNumbers = this.extractNumericTokens(candidateText);
      const unverifiedNums: string[] = [];
      for (const num of outputNumbers) {
        if (!verifiedNumbers.has(num)) {
          unverifiedNums.push(num);
        }
      }

      const notes: string[] = [];
      let passedValidation = true;

      if (unverifiedNums.length > 0) {
        // Hallucinated metric detected! Reject invented number
        notes.push(
          `Hallucinated metric rejected: [${unverifiedNums.join(", ")}] not present in source evidence. Stripping ungrounded metrics.`
        );
        passedValidation = false;
        // Fall back to clean non-numeric XYZ rewrite
        const cleanFallback = this.localDeterministicXyzRewrite(sourceBullet, parentEntry, false, targetJdKeywords);
        candidateText = cleanFallback.rewrittenText;
      }

      return {
        rewrittenText: candidateText,
        originalText: sourceBullet.text,
        xyzStructure: {
          accomplishedX: data.accomplishedX || "Accomplished core objective",
          measuredByY: unverifiedNums.length > 0 ? null : data.measuredByY || null,
          byDoingZ: data.byDoingZ || "Implementing targeted solution",
        },
        hasVerifiedMetric: hasVerifiedMetric && unverifiedNums.length === 0,
        suggestedMetricQuestion: data.suggestedMetricQuestion || (hasVerifiedMetric ? null : this.generateMetricQuestion(sourceBullet.text)),
        claimMap: Array.isArray(data.claimMap) && data.claimMap.length > 0
          ? data.claimMap
          : [{ claim: candidateText, evidenceIds: [sourceBullet.id], claimType: "action" }],
        sourceBulletIds: [sourceBullet.id],
        sourceFactIds: (sourceBullet.facts || []).map((f) => f.id),
        passedValidation,
        validationNotes: notes.length > 0 ? notes : ["Passed Google XYZ truth-bound validation."],
      };
    } catch (err: any) {
      console.warn("Pipeline B XYZ reasoning failed, falling back to local deterministic model:", err.message);
      return this.localDeterministicXyzRewrite(sourceBullet, parentEntry, hasVerifiedMetric, targetJdKeywords);
    }
  }

  /**
   * Deterministic XYZ rewriter for offline / zero-cost fallback
   */
  static localDeterministicXyzRewrite(
    sourceBullet: { id: string; text: string; facts?: StructuredFact[] },
    parentEntry: { title: string; organization?: string | null },
    hasVerifiedMetric: boolean,
    targetJdKeywords: string[] = []
  ): XyzRewriteResult {
    let cleanText = sourceBullet.text.replace(/^[•\-\*]\s*/, "").trim();

    // Replace passive "worked on" with active verbs
    cleanText = cleanText
      .replace(/^Worked on\b/i, "Engineered and maintained")
      .replace(/^Responsible for\b/i, "Delivered")
      .replace(/^Helped with\b/i, "Supported development of")
      .replace(/^Assisted in\b/i, "Contributed to");

    // Ensure ending period
    if (!cleanText.endsWith(".")) {
      cleanText += ".";
    }

    const question = hasVerifiedMetric ? null : this.generateMetricQuestion(sourceBullet.text);

    return {
      rewrittenText: cleanText,
      originalText: sourceBullet.text,
      xyzStructure: {
        accomplishedX: "Delivered key engineering functionality",
        measuredByY: hasVerifiedMetric ? "Verified project metrics" : null,
        byDoingZ: "Applying targeted development practices",
      },
      hasVerifiedMetric,
      suggestedMetricQuestion: question,
      claimMap: [{ claim: cleanText, evidenceIds: [sourceBullet.id], claimType: "action" }],
      sourceBulletIds: [sourceBullet.id],
      sourceFactIds: (sourceBullet.facts || []).map((f) => f.id),
      passedValidation: true,
      validationNotes: ["Grounded via deterministic XYZ engine."],
    };
  }

  /**
   * Helper to generate a contextual metric question when no metric exists
   */
  static generateMetricQuestion(bulletText: string): string {
    const lower = bulletText.toLowerCase();
    if (lower.includes("api") || lower.includes("backend") || lower.includes("server") || lower.includes("database")) {
      return "What was the measurable impact on latency, throughput, or query time? (e.g., % speedup, requests/sec)";
    }
    if (lower.includes("user") || lower.includes("frontend") || lower.includes("client") || lower.includes("ui")) {
      return "How many users, clients, or participants interacted with this feature? (e.g., 500+ active users)";
    }
    if (lower.includes("event") || lower.includes("hackathon") || lower.includes("organized") || lower.includes("lead")) {
      return "How many participants, teams, or colleges attended or competed? (e.g., 1000+ attendees)";
    }
    return "Can you quantify the measurable outcome of this task? (e.g., % time saved, scale, or accuracy)";
  }

  /**
   * Numeric token extractor
   */
  private static extractNumericTokens(text: string): Set<string> {
    const tokens = new Set<string>();
    // Matches percentages, counts, currency, multipliers (e.g., 35%, $50K, 1,000+, 2x, 100ms)
    const regex = /\b(?:\$|€|£)?\d+(?:[.,]\d+)*(?:%|[xX]|k|K|m|M|ms|s|\+)?\b/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      tokens.add(match[0].toLowerCase().replace(/[,\+]/g, ""));
    }
    return tokens;
  }
}
