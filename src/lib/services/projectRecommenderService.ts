import { db } from "@/lib/db/client";
import { bankEntries, achievementBullets, bulletFacts, projectMetadata } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { JDAnalysis, ProjectRecommendation } from "@/types/job";
import { ProjectMaturityLevel } from "@/types/bank";

export class ProjectRecommenderService {
  /**
   * Analyzes all projects in the candidate's Data Bank and produces a ranked shortlist
   * based on relevance to the JD, while strictly respecting project maturity and honest scope.
   */
  static async recommendProjects(
    userId: string,
    jdAnalysis: JDAnalysis
  ): Promise<ProjectRecommendation[]> {
    // 1. Fetch user projects from bank_entries
    const projects = await db
      .select()
      .from(bankEntries)
      .where(
        and(
          eq(bankEntries.userId, userId),
          eq(bankEntries.entryType, "project"),
          isNull(bankEntries.deletedAt)
        )
      );

    if (projects.length === 0) return [];

    // 2. Fetch associated bullets and metadata
    const bullets = await db
      .select()
      .from(achievementBullets)
      .where(and(eq(achievementBullets.userId, userId), isNull(achievementBullets.deletedAt)));

    const facts = await db
      .select()
      .from(bulletFacts)
      .where(eq(bulletFacts.userId, userId));

    const metaList = await db
      .select()
      .from(projectMetadata)
      .where(eq(projectMetadata.userId, userId));

    const metaMap = new Map(metaList.map((m) => [m.entryId, m]));

    // 3. Extract JD target skills & requirements
    const jdKeywords = (jdAnalysis.keywords || [])
      .map((k) => (k.canonical || (k as any).term || "").toLowerCase())
      .filter(Boolean);

    const recommendations: ProjectRecommendation[] = [];

    for (const proj of projects) {
      const projBullets = bullets.filter((b) => b.entryId === proj.id);
      const projBulletIds = new Set(projBullets.map((b) => b.id));
      const projFacts = facts.filter((f) => f.entryId === proj.id || (f.bulletId && projBulletIds.has(f.bulletId)));
      const meta = metaMap.get(proj.id);

      // Collect project skills and words
      const demonstratedSkills = new Set<string>();
      projFacts.forEach((f) => {
        if (f.factType === "tool" || f.factType === "technology") {
          demonstratedSkills.add(f.valueText);
        }
      });

      const combinedText = [
        proj.title,
        proj.descriptionContext || "",
        ...projBullets.map((b) => b.text),
      ].join(" ").toLowerCase();

      // Find matching requirements
      const supportedRequirements: string[] = [];
      for (const kw of jdKeywords) {
        if (combinedText.includes(kw)) {
          supportedRequirements.push(kw);
          demonstratedSkills.add(kw);
        }
      }

      // Calculate relevance score (0.0 to 1.0)
      const keywordOverlap = supportedRequirements.length;
      const relevanceScore = Math.min(
        1.0,
        parseFloat(((keywordOverlap * 0.25) + (projBullets.length > 0 ? 0.2 : 0.05)).toFixed(2))
      );

      // Determine maturity and known gaps from user-confirmed metadata
      const maturityLevel: ProjectMaturityLevel = (meta?.maturityLevel as ProjectMaturityLevel) || "functional_prototype";
      const knownGaps: string[] = [];
      if (meta?.implementationGaps) {
        knownGaps.push(meta.implementationGaps);
      }
      if (meta?.unfinishedFeatures) {
        knownGaps.push(`Unfinished features: ${meta.unfinishedFeatures}`);
      }
      if (meta?.limitations) {
        knownGaps.push(`Known limitations: ${meta.limitations}`);
      }

      // Generate honest, non-inflated draft description
      let tailoredDescription = proj.descriptionContext || projBullets[0]?.text || "";
      if (maturityLevel === "functional_prototype" || maturityLevel === "partially_implemented") {
        tailoredDescription = `Architected functional prototype demonstrating ${Array.from(demonstratedSkills).slice(0, 3).join(", ")}. Focused on core technical workflows.`;
      } else if (maturityLevel === "deployed" || maturityLevel === "completed") {
        tailoredDescription = projBullets.map((b) => b.text).join(" ");
      }

      // Ensure NO inflated forbidden terms ("production-ready", "enterprise-grade") appear unless user verified
      if (!meta?.isProductionReady) {
        tailoredDescription = tailoredDescription
          .replace(/production-ready/gi, "functional")
          .replace(/enterprise-grade/gi, "robust")
          .replace(/fully functional/gi, "implemented");
      }

      const rationale = `Demonstrates hands-on implementation of ${
        supportedRequirements.length > 0
          ? supportedRequirements.slice(0, 3).join(", ")
          : "relevant software engineering architecture"
      }. Status: ${maturityLevel.replace("_", " ")}.`;

      recommendations.push({
        projectId: proj.id,
        entryId: proj.id,
        title: proj.title,
        projectTitle: proj.title,
        organization: proj.organization,
        maturityLevel,
        relevanceScore: Math.round(relevanceScore * 100),
        relevanceRationale: rationale,
        relevanceExplanation: rationale,
        demonstratedSkills: Array.from(demonstratedSkills),
        supportedRequirements,
        supportedJobRequirements: supportedRequirements,
        existingEvidenceCount: projBullets.length + projFacts.length,
        knownGaps,
        userContribution: meta?.actualContribution || "Lead architect & developer",
        selected: false, // User MUST explicitly select
        tailoredDescription,
        userApproved: false,
        metadata: meta || undefined,
      } as any);
    }

    // Sort by relevance descending
    recommendations.sort((a, b) => b.relevanceScore - a.relevanceScore);
    return recommendations;
  }

  /**
   * Updates or saves project maturity and honesty metadata
   */
  static async upsertProjectMetadata(
    userId: string,
    entryId: string,
    data: {
      maturityLevel: ProjectMaturityLevel;
      actualContribution?: string;
      implementationGaps?: string;
      unfinishedFeatures?: string;
      limitations?: string;
      isProductionReady?: boolean;
      architectureNotes?: string;
      repositoryUrl?: string;
      liveUrl?: string;
    }
  ): Promise<any> {
    const existing = await db
      .select()
      .from(projectMetadata)
      .where(and(eq(projectMetadata.userId, userId), eq(projectMetadata.entryId, entryId)));

    const now = new Date();
    if (existing.length > 0) {
      const [updated] = await db
        .update(projectMetadata)
        .set({
          maturityLevel: data.maturityLevel,
          actualContribution: data.actualContribution,
          implementationGaps: data.implementationGaps,
          unfinishedFeatures: data.unfinishedFeatures,
          limitations: data.limitations,
          isProductionReady: data.isProductionReady ?? false,
          architectureNotes: data.architectureNotes,
          repositoryUrl: data.repositoryUrl,
          liveUrl: data.liveUrl,
          updatedAt: now,
        })
        .where(eq(projectMetadata.id, existing[0].id))
        .returning();
      return updated;
    } else {
      const id = `pm_${Date.now()}`;
      const [inserted] = await db
        .insert(projectMetadata)
        .values({
          id,
          userId,
          entryId,
          maturityLevel: data.maturityLevel,
          actualContribution: data.actualContribution,
          implementationGaps: data.implementationGaps,
          unfinishedFeatures: data.unfinishedFeatures,
          limitations: data.limitations,
          isProductionReady: data.isProductionReady ?? false,
          architectureNotes: data.architectureNotes,
          repositoryUrl: data.repositoryUrl,
          liveUrl: data.liveUrl,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      return inserted;
    }
  }
}
