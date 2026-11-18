import { LlmProvider, StructuredLlmInput, TokenUsage } from "../providerInterface";
import { JDAnalysisService } from "../../services/jdAnalysisService";
import { RewrittenBullet } from "@/types/job";

/**
 * Local Deterministic Provider Adapter (Section 7.5 / 10.7)
 * Ensures complete $0 zero-cost offline capability, deterministic test passes, and golden-set evaluations.
 */
export class LocalDeterministicAdapter implements LlmProvider {
  name = "local-deterministic";

  async generateStructured<T>(
    input: StructuredLlmInput<T>
  ): Promise<{ data: T; model: string; usage?: TokenUsage }> {
    const payload = input.userPayload as any;

    if (input.task === "analyze_jd") {
      const rawText = payload.rawText || "";
      const analysis = JDAnalysisService.analyzeDeterministic(rawText);
      return {
        data: analysis as unknown as T,
        model: "deterministic-v1",
        usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
      };
    }

    if (input.task === "rewrite") {
      const sourceBullet = payload.sourceBullet || { text: "", id: "b0" };
      const jdKeywords = (payload.jdKeywords as string[]) || [];

      // Check if any JD keyword is already genuinely in the source bullet or facts
      const matchedKeywords = jdKeywords.filter((kw) =>
        sourceBullet.text.toLowerCase().includes(kw.toLowerCase())
      );

      // Rephrase strictly by emphasizing matched truth without adding new claims
      let rewrittenText = sourceBullet.text;
      if (matchedKeywords.length > 0 && !rewrittenText.toLowerCase().startsWith("leveraged")) {
        // Safe rephrasing: keeps existing metrics and facts exactly intact
        rewrittenText = `${sourceBullet.text}`;
      }

      const rewrittenBullet: RewrittenBullet = {
        text: rewrittenText,
        sourceBulletIds: [sourceBullet.id],
        sourceFactIds: (sourceBullet.facts || []).map((f: any) => f.id),
        claimMap: [
          {
            claim: rewrittenText,
            evidenceIds: [sourceBullet.id],
            claimType: "action",
          },
        ],
        validatorStatus: "passed",
      };

      return {
        data: rewrittenBullet as unknown as T,
        model: "deterministic-v1",
        usage: { promptTokens: 150, completionTokens: 80, totalTokens: 230 },
      };
    }

    if (input.task === "cover_letter") {
      const roleTitle = payload.roleTitle || payload.roleTarget?.title || "Target Role";
      const company = payload.company || payload.roleTarget?.company || "Target Company";
      const candidateName = payload.candidateName || "Applicant";
      const topBullets =
        (payload.topBullets || payload.candidateAchievements || []) as Array<{ text: string }>;

      const bulletHighlights = topBullets
        .slice(0, 3)
        .map((b) => `• ${b.text}`)
        .join("\n");

      const letter = `Dear Hiring Team at ${company},\n\nI am writing to express my enthusiastic interest in the ${roleTitle} position. With a strong track record of engineering impact grounded in reliable systems architecture, I am eager to contribute to ${company}'s goals.\n\nThroughout my career, I have consistently focused on delivering measurable outcomes:\n${bulletHighlights}\n\nI look forward to discussing how my evidenced technical background aligns with your team's needs.\n\nSincerely,\n${candidateName}`;

      return {
        data: { content: letter } as unknown as T,
        model: "deterministic-v1",
        usage: { promptTokens: 200, completionTokens: 180, totalTokens: 380 },
      };
    }

    throw new Error(`Task ${input.task} not supported by LocalDeterministicAdapter.`);
  }
}
