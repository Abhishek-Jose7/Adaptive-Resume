import { db } from "../db/client";
import { aiRuns, jobs, jdAnalyses, bankEntries, achievementBullets, bulletFacts } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { ProviderFactory } from "../ai/providerFactory";
import { BulletRetriever } from "../tailoring/bulletRetriever";
import { TruthBoundValidator } from "../tailoring/truthBoundValidator";
import { JDAnalysis, RewrittenBullet } from "@/types/job";
import { BankEntry, AchievementBullet, StructuredFact } from "@/types/bank";
import { diffWords } from "diff";

export interface TailoredBulletResult {
  bulletId: string;
  originalText: string;
  rewrittenText: string;
  sourceBulletIds: string[];
  sourceFactIds: string[];
  claimMap: any[];
  validatorStatus: "passed" | "rejected" | "fallback_to_source";
  validationNotes: string[];
  retryCount: number;
  status: "pending" | "accepted" | "rejected";
  diffHtml?: string;
}

export interface AiRunDetails {
  id: string;
  userId: string;
  jobId: string;
  provider: string;
  model: string;
  promptVersion: string;
  tokensIn: number;
  tokensOut: number;
  createdAt: string;
  results: TailoredBulletResult[];
}

export class TailoringService {
  /**
   * Orchestrates the complete truth-bound AI tailoring pipeline
   * PRD Section 10.1 - 10.4
   */
  static async tailorJob(
    userId: string,
    jobId: string,
    providerName?: string,
    apiKey?: string
  ): Promise<AiRunDetails> {
    // 1. Fetch Job and JD Analysis
    const jobList = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.userId, userId), eq(jobs.id, jobId)))
      .limit(1);

    if (jobList.length === 0) {
      throw new Error(`Job not found: ${jobId}`);
    }

    const jdList = await db
      .select()
      .from(jdAnalyses)
      .where(and(eq(jdAnalyses.userId, userId), eq(jdAnalyses.jobId, jobId)))
      .limit(1);

    if (jdList.length === 0) {
      throw new Error(`JD Analysis not found for job: ${jobId}. Run analysis first.`);
    }

    const jdAnalysis = jdList[0].analysisJson as unknown as JDAnalysis;

    // 2. Fetch User Bank Entries, Bullets and Facts
    const userEntries = await db
      .select()
      .from(bankEntries)
      .where(eq(bankEntries.userId, userId));

    const userBullets = await db
      .select()
      .from(achievementBullets)
      .where(eq(achievementBullets.userId, userId));

    const userFacts = await db
      .select()
      .from(bulletFacts)
      .where(eq(bulletFacts.userId, userId));

    // Assemble hierarchical entries
    const factsByBullet = new Map<string, StructuredFact[]>();
    for (const f of userFacts) {
      if (f.bulletId) {
        const list = factsByBullet.get(f.bulletId) || [];
        list.push(f as unknown as StructuredFact);
        factsByBullet.set(f.bulletId, list);
      }
    }

    const bulletsByEntry = new Map<string, AchievementBullet[]>();
    for (const b of userBullets) {
      const bObj: AchievementBullet = {
        ...(b as unknown as AchievementBullet),
        facts: factsByBullet.get(b.id) || [],
      };
      const list = bulletsByEntry.get(b.entryId) || [];
      list.push(bObj);
      bulletsByEntry.set(b.entryId, list);
    }

    const fullEntries: BankEntry[] = userEntries.map((e) => ({
      ...(e as unknown as BankEntry),
      bullets: bulletsByEntry.get(e.id) || [],
    }));

    // 3. Candidate Retrieval & Budgeting (Section 10.3)
    const retrieval = BulletRetriever.retrieveCandidates(fullEntries, jdAnalysis);
    const candidates = retrieval.candidates;

    const provider = ProviderFactory.getProvider(providerName, apiKey);
    let totalTokensIn = 0;
    let totalTokensOut = 0;
    const tailoredResults: TailoredBulletResult[] = [];

    // System prompt enforcing Section 10.4 truth-grounded rules
    const systemPrompt = `You are a Truth-Bound Resume Tailoring Assistant.
CRITICAL INTEGRITY RULES:
1. Every factual claim MUST be explicitly entailed by the provided source bullet and structured facts.
2. NEVER invent or hallucinate metrics, percentages, tools, employers, or outcomes.
3. Do NOT promote scope (e.g. do not turn "assisted" or "contributed" into "led", "architected", or "owned").
4. Return a structured JSON object matching RewrittenBullet:
   - text: string (concise, active achievement bullet)
   - sourceBulletIds: string[]
   - sourceFactIds: string[]
   - claimMap: Array<{ claim: string; evidenceIds: string[]; claimType: "action" | "tool" | "metric" | "scope" | "outcome" | "date" | "other" }>`;

    const allCandidateBullets = candidates.map((c) => c.bullet);
    const allCandidateFacts = userFacts as unknown as StructuredFact[];

    // 4. Tailor each candidate bullet
    for (const item of candidates) {
      const sourceBullet = item.bullet;
      const relevantKeywords = item.scoreBreakdown.matchedKeywords;

      const userPayload = {
        sourceBullet,
        parentEntry: {
          title: item.parentEntry.title,
          organization: item.parentEntry.organization,
          descriptionContext: item.parentEntry.descriptionContext,
        },
        facts: item.facts,
        jdTarget: {
          title: jdAnalysis.role.title,
          targetKeywords: relevantKeywords,
        },
      };

      let attempt = 0;
      let finalResult: TailoredBulletResult | null = null;
      let promptFeedback = "";

      while (attempt <= 1) {
        attempt++;
        const llmInput = {
          task: "rewrite" as const,
          systemPrompt: promptFeedback
            ? `${systemPrompt}\n\nPREVIOUS ATTEMPT FAILED TRUTH VALIDATION: ${promptFeedback}\nFix the violation immediately or keep the original phrasing.`
            : systemPrompt,
          userPayload,
          schema: {},
          maxOutputTokens: 256,
          temperature: 0.1,
        };

        const res = await provider.generateStructured<RewrittenBullet>(llmInput);
        if (res.usage) {
          totalTokensIn += res.usage.promptTokens;
          totalTokensOut += res.usage.completionTokens;
        }

        const candidateRewrite = res.data;

        // Run Deterministic Truth-Bound Validation
        const validation = TruthBoundValidator.validate(
          candidateRewrite,
          allCandidateBullets,
          allCandidateFacts,
          fullEntries
        );

        if (validation.isValid) {
          // Compute diff
          const diff = diffWords(sourceBullet.text, candidateRewrite.text);
          const diffHtml = diff
            .map((part) => {
              if (part.added) return `<ins class="bg-green-100 text-green-800">${part.value}</ins>`;
              if (part.removed) return `<del class="bg-red-100 text-red-800 line-through">${part.value}</del>`;
              return part.value;
            })
            .join("");

          finalResult = {
            bulletId: sourceBullet.id,
            originalText: sourceBullet.text,
            rewrittenText: candidateRewrite.text,
            sourceBulletIds: candidateRewrite.sourceBulletIds,
            sourceFactIds: candidateRewrite.sourceFactIds,
            claimMap: candidateRewrite.claimMap,
            validatorStatus: "passed",
            validationNotes: ["Passed all truth-bound validation checks."],
            retryCount: attempt - 1,
            status: "pending",
            diffHtml,
          };
          break;
        } else {
          // If 1st attempt failed, set feedback and retry
          if (attempt === 1) {
            promptFeedback = validation.feedbackForRetry || "Validation failed";
          } else {
            // Second attempt failed: Mandatory conservative fallback to source bullet (PRD 10.4 Rule 9)
            finalResult = {
              bulletId: sourceBullet.id,
              originalText: sourceBullet.text,
              rewrittenText: sourceBullet.text,
              sourceBulletIds: [sourceBullet.id],
              sourceFactIds: (sourceBullet.facts || []).map((f) => f.id),
              claimMap: [
                {
                  claim: sourceBullet.text,
                  evidenceIds: [sourceBullet.id],
                  claimType: "action",
                },
              ],
              validatorStatus: "fallback_to_source",
              validationNotes: [
                `AI rewrite rejected: ${validation.feedbackForRetry}`,
                "Fell back to verified source bullet to guarantee zero hallucination.",
              ],
              retryCount: attempt - 1,
              status: "pending",
              diffHtml: sourceBullet.text,
            };
          }
        }
      }

      if (finalResult) {
        tailoredResults.push(finalResult);
      }
    }

    // 5. Store AI Run Record
    const runId = crypto.randomUUID();
    const newRun = {
      id: runId,
      userId,
      taskType: "rewrite",
      jobId,
      resumeVersionId: null,
      provider: provider.name,
      model: "v1-truth-bound",
      promptVersion: "v1.0",
      tokensIn: totalTokensIn,
      tokensOut: totalTokensOut,
      validatorReportJson: { results: tailoredResults } as any,
    };

    await db.insert(aiRuns).values(newRun);

    return {
      id: runId,
      userId,
      jobId,
      provider: provider.name,
      model: "v1-truth-bound",
      promptVersion: "v1.0",
      tokensIn: totalTokensIn,
      tokensOut: totalTokensOut,
      createdAt: new Date().toISOString(),
      results: tailoredResults,
    };
  }

  /**
   * Retrieves an AI Run by ID
   */
  static async getRun(userId: string, runId: string): Promise<AiRunDetails | null> {
    const list = await db
      .select()
      .from(aiRuns)
      .where(and(eq(aiRuns.userId, userId), eq(aiRuns.id, runId)))
      .limit(1);

    if (list.length === 0) return null;
    const r = list[0];
    const report = r.validatorReportJson as any;

    return {
      id: r.id,
      userId: r.userId,
      jobId: r.jobId || "",
      provider: r.provider,
      model: r.model,
      promptVersion: r.promptVersion,
      tokensIn: r.tokensIn || 0,
      tokensOut: r.tokensOut || 0,
      createdAt: r.createdAt.toISOString(),
      results: report?.results || [],
    };
  }

  /**
   * Accepts or rejects an individual tailored bullet
   */
  static async updateItemStatus(
    userId: string,
    runId: string,
    bulletId: string,
    status: "accepted" | "rejected"
  ): Promise<AiRunDetails> {
    const run = await this.getRun(userId, runId);
    if (!run) throw new Error("AI run not found");

    const updatedResults = run.results.map((item) => {
      if (item.bulletId === bulletId) {
        return { ...item, status };
      }
      return item;
    });

    await db
      .update(aiRuns)
      .set({
        validatorReportJson: { results: updatedResults } as any,
      })
      .where(and(eq(aiRuns.userId, userId), eq(aiRuns.id, runId)));

    return {
      ...run,
      results: updatedResults,
    };
  }
}
