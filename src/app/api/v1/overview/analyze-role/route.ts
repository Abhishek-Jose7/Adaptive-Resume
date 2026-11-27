import { NextRequest } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth/clerk";
import { BankRepository } from "@/lib/repositories/bankRepository";
import { ProviderFactory } from "@/lib/ai/providerFactory";
import { analyzeRoleFitAgainstVault } from "@/lib/scoring/roleFitInsight";
import { apiSuccess, handleApiError } from "@/lib/api/response";

const AnalyzeOverviewSchema = z.object({
  rawText: z.string().min(10, "Paste at least a short job description to analyze.").max(30000),
});

const LlmRoleFitSchema = z.object({
  roleTitle: z.string().min(2).max(80),
  matchScore: z.number().min(0).max(100),
  verdict: z.string().min(4).max(120),
  summaryInsight: z.string().min(10).max(600),
  matchedStrengths: z.array(z.string()).max(10),
  unclearOrMissing: z.array(z.string()).max(8),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const body = await req.json();
    const { rawText } = AnalyzeOverviewSchema.parse(body);

    const { items: entries } = await BankRepository.listEntries(user.userId, { limit: 100 });
    const baseline = analyzeRoleFitAgainstVault(rawText, entries);

    // Compact, strictly grounded snapshot of the user's real Career Vault
    const vaultDigest = entries
      .filter((e) => e.entryType !== "profile")
      .map((e) => ({
        type: e.entryType,
        title: e.title,
        org: e.organization || undefined,
        dates: e.startDate ? `${e.startDate} - ${e.isCurrent ? "Present" : e.endDate || ""}` : undefined,
        context: e.descriptionContext || undefined,
        bullets: (e.bullets || []).map((b) => b.text),
      }));

    let aiResult: z.infer<typeof LlmRoleFitSchema> | null = null;
    const provider = ProviderFactory.getReasoningProvider(undefined, undefined, user.email);

    if (provider.name !== "local_deterministic" && vaultDigest.length > 0) {
      try {
        const llmPromise = provider.generateStructured<z.infer<typeof LlmRoleFitSchema>>({
          task: "analyze_jd",
          systemPrompt: [
            "You are a candid, grounded technical hiring advisor comparing a candidate's verified Career Vault against a target job description.",
            "Rules:",
            "1. Only claim strengths that are genuinely evidenced in the candidate's Career Vault entries/bullets below. Never invent experience.",
            "2. Distinguish hands-on bullet evidence from mere skill-tag mentions: if a required skill (for example, Embeddings, LLM Evals, Docker, etc.) is missing or only appears as a tag without a bullet explaining hands-on work, point that out clearly (e.g., 'Your experience with X isn't clear from your bullets yet').",
            "3. Write summaryInsight in 2-3 natural, direct, specific sentences naming relevant projects/roles from the candidate's Career Vault (e.g., 'Your LLM and agent work in Project Alpha looks relevant to the role. Your experience with embeddings isn't clear from your resume, so that's worth bearing in mind.').",
            "4. Return strict JSON matching the schema with matchScore (0-100 integer) calibrated fairly to evidenced skills + domain depth vs role requirements.",
          ].join("\n"),
          userPayload: {
            jobDescription: rawText.slice(0, 8000),
            careerVault: vaultDigest,
            baselineEvidenceCheck: {
              detectedRoleTitle: baseline.extractedTitle,
              evidencedInBullets: baseline.matchedSkills,
              listedInSkillTagsOnly: baseline.tagOnlySkills,
              missingFromVault: baseline.missingSkills,
            },
          },
          schema: LlmRoleFitSchema,
          maxOutputTokens: 550,
          temperature: 0.2,
        });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Role fit AI timeout")), 6500)
        );

        const response = await Promise.race([llmPromise, timeoutPromise]);
        const parsed = LlmRoleFitSchema.safeParse(response?.data);
        if (parsed.success) {
          aiResult = parsed.data;
        }
      } catch (err) {
        console.warn("[overview/analyze-role] Falling back to grounded deterministic insight:", err);
      }
    }

    if (aiResult) {
      return apiSuccess({
        extractedTitle: aiResult.roleTitle,
        score: Math.round(aiResult.matchScore),
        suitabilityVerdict: aiResult.verdict,
        summaryInsight: aiResult.summaryInsight,
        matchedSkills: aiResult.matchedStrengths,
        tagOnlySkills: baseline.tagOnlySkills,
        missingSkills: aiResult.unclearOrMissing,
        relevantEvidenceLabels: baseline.relevantEvidenceLabels,
        totalFactsCount: baseline.totalFactsCount,
        source: "ai_grounded",
      });
    }

    return apiSuccess({
      ...baseline,
      source: "evidence_engine",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
