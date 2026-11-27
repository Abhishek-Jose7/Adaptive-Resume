import { db } from "@/lib/db/client";
import {
  careerGraphEdges,
  bankEntries,
  achievementBullets,
  bulletFacts,
} from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { CareerGraphEdge, CareerGraphRelationType } from "@/types/bank";
import { classifySkillGroupName } from "@/lib/services/portfolioSkillGrouping";

export interface GraphNode {
  id: string;
  type: string;
  label: string;
  category?: string;
  metadata?: Record<string, unknown>;
}

export interface CareerGraphViewData {
  nodes: GraphNode[];
  edges: CareerGraphEdge[];
  stats: {
    totalNodes: number;
    totalEdges: number;
    evidencedSkillCount: number;
    projectCount: number;
    experienceCount: number;
  };
}

export class CareerGraphService {
  private static splitSkillTokens(rawText: string): string[] {
    return rawText
      .split(/[,•|\n;]+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 1 && t.length <= 50);
  }

  private static escapeRegex(raw: string): string {
    return raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private static doesEntryEvidenceSkill(entryText: string, skillName: string): boolean {
    const clean = skillName.trim();
    if (!clean || !entryText) return false;
    const lowerText = entryText.toLowerCase();
    const lowerSkill = clean.toLowerCase();

    if (lowerSkill === "c") {
      return /(?:^|[\s,|/(])c(?=$|[\s,|/.)])/i.test(entryText);
    }
    if (lowerSkill === "html/css") {
      return /\b(html|css)\b/i.test(entryText);
    }
    const aliases: string[] = [lowerSkill];
    if (lowerSkill === "postgresql") aliases.push("postgres");
    if (lowerSkill === "next.js") aliases.push("nextjs");
    if (lowerSkill === "node.js") aliases.push("nodejs");
    if (lowerSkill === "llms") aliases.push("llm");
    if (lowerSkill === "ai agents") aliases.push("ai agent", "tool calls", "mcp");
    if (lowerSkill === "rag") aliases.push("retrieval-augmented", "llm-powered retrieval");
    if (lowerSkill === "google cloud") aliases.push("gcp");

    return aliases.some((alias) => {
      if (alias.length <= 2) {
        return new RegExp(`(?:^|[\\s,|/(])${this.escapeRegex(alias)}(?=$|[\\s,|/.)])`, "i").test(
          lowerText
        );
      }
      return new RegExp(`\\b${this.escapeRegex(alias)}\\b`, "i").test(lowerText);
    });
  }

  /**
   * Synchronizes Career Graph edges from the user's existing Data Bank records,
   * including skill_group memberships and evidenced project/experience mentions.
   */
  static async syncBankToGraph(userId: string): Promise<number> {
    const [entries, bullets, facts, existingEdges] = await Promise.all([
      db
        .select()
        .from(bankEntries)
        .where(and(eq(bankEntries.userId, userId), isNull(bankEntries.deletedAt))),
      db
        .select()
        .from(achievementBullets)
        .where(and(eq(achievementBullets.userId, userId), isNull(achievementBullets.deletedAt))),
      db
        .select()
        .from(bulletFacts)
        .where(eq(bulletFacts.userId, userId)),
      db
        .select()
        .from(careerGraphEdges)
        .where(eq(careerGraphEdges.userId, userId)),
    ]);

    const existingPairKeys = new Set(
      existingEdges.map((e) => `${e.sourceId}::${e.targetId}::${e.relationshipType}`)
    );

    const bulletsByEntry = new Map<string, typeof bullets>();
    for (const b of bullets) {
      const list = bulletsByEntry.get(b.entryId) || [];
      list.push(b);
      bulletsByEntry.set(b.entryId, list);
    }

    const factsByBullet = new Map<string, typeof facts>();
    for (const f of facts) {
      if (!f.bulletId) continue;
      const list = factsByBullet.get(f.bulletId) || [];
      list.push(f);
      factsByBullet.set(f.bulletId, list);
    }

    const edgesToInsert: Array<typeof careerGraphEdges.$inferInsert> = [];
    const skillNameById = new Map<string, string>();

    const queueEdge = (edge: typeof careerGraphEdges.$inferInsert) => {
      const pairKey = `${edge.sourceId}::${edge.targetId}::${edge.relationshipType}`;
      if (existingPairKeys.has(pairKey)) return;
      existingPairKeys.add(pairKey);
      edgesToInsert.push(edge);
    };

    for (const f of facts) {
      if ((f.factType === "tool" || f.factType === "technology") && f.valueText.trim()) {
        const sId = f.valueText.trim().toLowerCase();
        if (!skillNameById.has(sId)) skillNameById.set(sId, f.valueText.trim());
      }
    }

    for (const entry of entries) {
      const entryBullets = bulletsByEntry.get(entry.id) || [];
      if (entry.entryType === "skill_group" || entry.entryType === "skill") {
        if (entry.entryType === "skill" && entry.title.trim()) {
          const titleSkill = entry.title.trim();
          const titleSkillId = titleSkill.toLowerCase();
          if (!skillNameById.has(titleSkillId)) skillNameById.set(titleSkillId, titleSkill);
        }
        for (const b of entryBullets) {
          for (const token of this.splitSkillTokens(b.text)) {
            const skillId = token.toLowerCase();
            if (!skillNameById.has(skillId)) skillNameById.set(skillId, token);
            queueEdge({
              id: `edge_sg_sk_${entry.id}_${skillId.replace(/[^a-z0-9]/g, "_")}`,
              userId,
              sourceType: entry.entryType,
              sourceId: entry.id,
              targetType: "skill",
              targetId: skillId,
              relationshipType: "used_skill",
              weight: 1.0,
              metadataJson: {
                skillName: token,
                sourceEntryTitle: entry.title,
                category: entry.title,
              },
            });
          }
        }
        continue;
      }

      for (const b of entryBullets) {
        queueEdge({
          id: `edge_ent_b_${entry.id}_${b.id}`,
          userId,
          sourceType: entry.entryType,
          sourceId: entry.id,
          targetType: "achievement_bullet",
          targetId: b.id,
          relationshipType: "produced_outcome",
          weight: 1.0,
          metadataJson: { bulletTextSnippet: b.text.slice(0, 80) },
        });

        const bFacts = factsByBullet.get(b.id) || [];
        for (const f of bFacts) {
          queueEdge({
            id: `edge_b_fact_${b.id}_${f.id}`,
            userId,
            sourceType: "achievement_bullet",
            sourceId: b.id,
            targetType: f.factType,
            targetId: f.id,
            relationshipType: "demonstrated_competency",
            weight: 1.0,
            metadataJson: { factKey: f.factKey, valueText: f.valueText },
          });

          if (f.factType === "tool" || f.factType === "technology") {
            const skillId = f.valueText.trim().toLowerCase();
            if (!skillNameById.has(skillId)) skillNameById.set(skillId, f.valueText.trim());
            queueEdge({
              id: `edge_ent_tool_${entry.id}_${f.factKey}`,
              userId,
              sourceType: entry.entryType,
              sourceId: entry.id,
              targetType: "skill",
              targetId: skillId,
              relationshipType: "used_skill",
              weight: 1.0,
              metadataJson: { skillName: f.valueText, sourceEntryTitle: entry.title },
            });
          }
        }
      }
    }

    // Cross-link every known skill against built projects and work experiences
    const workAndProjects = entries.filter(
      (e) => e.entryType === "project" || e.entryType === "experience"
    );
    for (const entry of workAndProjects) {
      const entryBullets = bulletsByEntry.get(entry.id) || [];
      const combinedText = [
        entry.title,
        entry.organization || "",
        entry.descriptionContext || "",
        ...entryBullets.map((b) => b.text),
      ].join(" \n ");

      for (const [skillId, skillLabel] of skillNameById.entries()) {
        if (!this.doesEntryEvidenceSkill(combinedText, skillLabel)) continue;
        const relType: CareerGraphRelationType =
          entry.entryType === "project" ? "skill_used_in_project" : "skill_used_in_experience";
        queueEdge({
          id: `edge_ev_${entry.id}_${skillId.replace(/[^a-z0-9]/g, "_")}`,
          userId,
          sourceType: entry.entryType,
          sourceId: entry.id,
          targetType: "skill",
          targetId: skillId,
          relationshipType: relType,
          weight: 1.0,
          metadataJson: { skillName: skillLabel, sourceEntryTitle: entry.title },
        });
      }
    }

    if (edgesToInsert.length === 0) return 0;

    // Deduplicate edge IDs in memory before batched insert
    const deduped = Array.from(new Map(edgesToInsert.map((e) => [e.id, e])).values());
    const inserted = await db
      .insert(careerGraphEdges)
      .values(deduped)
      .onConflictDoNothing()
      .returning({ id: careerGraphEdges.id });

    return inserted.length;
  }

  /**
   * Auto-categorizes unlinked skills (0 graph links) by linking them to matching
   * existing or newly created domain `skill_group` categories and built work/projects.
   */
  static async autoCategorizeUnlinkedSkills(userId: string): Promise<{
    categorizedCount: number;
    linkedCount: number;
    categoriesCreated: string[];
  }> {
    const syncedFromEvidence = await this.syncBankToGraph(userId);

    const [entries, bullets, facts, edges] = await Promise.all([
      db
        .select()
        .from(bankEntries)
        .where(and(eq(bankEntries.userId, userId), isNull(bankEntries.deletedAt))),
      db
        .select()
        .from(achievementBullets)
        .where(and(eq(achievementBullets.userId, userId), isNull(achievementBullets.deletedAt))),
      db
        .select()
        .from(bulletFacts)
        .where(eq(bulletFacts.userId, userId)),
      db
        .select()
        .from(careerGraphEdges)
        .where(eq(careerGraphEdges.userId, userId)),
    ]);

    const connectedNodeIds = new Set<string>();
    const groupLinkedSkillIds = new Set<string>();
    const skillGroupIds = new Set(
      entries.filter((e) => e.entryType === "skill_group").map((e) => e.id)
    );

    for (const edge of edges) {
      connectedNodeIds.add(edge.sourceId);
      connectedNodeIds.add(edge.targetId);
      if (skillGroupIds.has(edge.sourceId) && edge.targetType === "skill") {
        groupLinkedSkillIds.add(edge.targetId);
      }
      if (skillGroupIds.has(edge.targetId) && edge.sourceType === "skill") {
        groupLinkedSkillIds.add(edge.sourceId);
      }
    }

    const skillCandidates = new Map<string, string>();
    for (const f of facts) {
      if ((f.factType === "tool" || f.factType === "technology") && f.valueText.trim()) {
        const key = f.valueText.trim().toLowerCase();
        if (!skillCandidates.has(key)) skillCandidates.set(key, f.valueText.trim());
      }
    }
    for (const e of entries.filter((ent) => ent.entryType === "skill")) {
      const key = e.title.trim().toLowerCase();
      if (key && !skillCandidates.has(key)) skillCandidates.set(key, e.title.trim());
    }

    const bulletsByEntry = new Map<string, typeof bullets>();
    for (const b of bullets) {
      const list = bulletsByEntry.get(b.entryId) || [];
      list.push(b);
      bulletsByEntry.set(b.entryId, list);
    }

    // Track existing skill groups by lowercase title & category heuristics
    const existingGroups = entries.filter((e) => e.entryType === "skill_group");
    const groupByCategoryLower = new Map<string, typeof existingGroups[0]>();
    for (const g of existingGroups) {
      groupByCategoryLower.set(g.title.trim().toLowerCase(), g);
    }

    const categoriesCreated: string[] = [];
    const edgesToInsert: Array<typeof careerGraphEdges.$inferInsert> = [];
    let categorizedCount = 0;

    for (const [skillId, skillLabel] of skillCandidates.entries()) {
      const hasAnyLink = connectedNodeIds.has(skillId);
      const hasGroupLink = groupLinkedSkillIds.has(skillId);
      if (hasAnyLink && hasGroupLink) continue;

      const targetCategory = classifySkillGroupName(skillLabel);
      const targetKey = targetCategory.toLowerCase();
      let group =
        groupByCategoryLower.get(targetKey) ||
        existingGroups.find((g) => {
          const gTitle = g.title.toLowerCase();
          return (
            gTitle.includes(targetKey.split("&")[0].trim()) ||
            targetKey.includes(gTitle.split("&")[0].trim())
          );
        });

      if (!group) {
        const newGroupId = `entry_sg_${crypto.randomUUID()}`;
        const [insertedGroup] = await db
          .insert(bankEntries)
          .values({
            id: newGroupId,
            userId,
            entryType: "skill_group",
            title: targetCategory,
            visibility: "private",
            verificationStatus: "unverified",
            sortOrder: existingGroups.length,
            rowVersion: 1,
          })
          .returning();
        group = insertedGroup;
        existingGroups.push(group);
        groupByCategoryLower.set(targetKey, group);
        categoriesCreated.push(targetCategory);
      }

      // Ensure the skill token exists in that group's Vault bullets when ungrouped
      const groupBullets = bulletsByEntry.get(group.id) || [];
      const alreadyListedInGroup = groupBullets.some((b) =>
        this.splitSkillTokens(b.text).some((tok) => tok.toLowerCase() === skillId)
      );
      if (!alreadyListedInGroup) {
        const [insertedBullet] = await db
          .insert(achievementBullets)
          .values({
            id: `bul_sg_${crypto.randomUUID()}`,
            userId,
            entryId: group.id,
            text: skillLabel,
            sortOrder: groupBullets.length,
            visibility: "private",
            verificationStatus: "unverified",
            usagePolicy: "eligible",
            rowVersion: 1,
          })
          .returning();
        groupBullets.push(insertedBullet);
        bulletsByEntry.set(group.id, groupBullets);
      }

      edgesToInsert.push({
        id: `edge_sg_sk_${group.id}_${skillId.replace(/[^a-z0-9]/g, "_")}`,
        userId,
        sourceType: "skill_group",
        sourceId: group.id,
        targetType: "skill",
        targetId: skillId,
        relationshipType: "used_skill",
        weight: 1.0,
        metadataJson: {
          skillName: skillLabel,
          sourceEntryTitle: group.title,
          category: group.title,
          autoCategorized: true,
        },
      });
      categorizedCount++;
    }

    let addedEdges = 0;
    if (edgesToInsert.length > 0) {
      const deduped = Array.from(new Map(edgesToInsert.map((e) => [e.id, e])).values());
      const inserted = await db
        .insert(careerGraphEdges)
        .values(deduped)
        .onConflictDoNothing()
        .returning({ id: careerGraphEdges.id });
      addedEdges = inserted.length;
    }

    return {
      categorizedCount,
      linkedCount: syncedFromEvidence + addedEdges,
      categoriesCreated,
    };
  }

  /**
   * Retrieves the user's complete Career Graph view for rendering and analysis
   */
  static async getGraph(userId: string): Promise<CareerGraphViewData> {
    const [edges, entries, bullets, facts] = await Promise.all([
      db
        .select()
        .from(careerGraphEdges)
        .where(eq(careerGraphEdges.userId, userId)),
      db
        .select()
        .from(bankEntries)
        .where(and(eq(bankEntries.userId, userId), isNull(bankEntries.deletedAt))),
      db
        .select()
        .from(achievementBullets)
        .where(and(eq(achievementBullets.userId, userId), isNull(achievementBullets.deletedAt))),
      db
        .select()
        .from(bulletFacts)
        .where(eq(bulletFacts.userId, userId)),
    ]);

    const nodesMap = new Map<string, GraphNode>();
    const entryTitleById = new Map<string, string>(entries.map((e) => [e.id, e.title]));
    const skillGroupIds = new Set(
      entries.filter((e) => e.entryType === "skill_group").map((e) => e.id)
    );
    const linkedCategoryBySkill = new Map<string, string>();
    for (const edge of edges) {
      if (skillGroupIds.has(edge.sourceId) && edge.targetType === "skill") {
        const title = entryTitleById.get(edge.sourceId);
        if (title) linkedCategoryBySkill.set(edge.targetId, title);
      }
    }

    for (const e of entries) {
      nodesMap.set(e.id, {
        id: e.id,
        type: e.entryType,
        label: e.title,
        category: e.organization || e.entryType,
        metadata: { startDate: e.startDate, endDate: e.endDate, isCurrent: e.isCurrent },
      });
    }

    for (const b of bullets) {
      nodesMap.set(b.id, {
        id: b.id,
        type: "achievement_bullet",
        label: b.text.length > 50 ? `${b.text.slice(0, 48)}...` : b.text,
        category: "bullet",
        metadata: { fullText: b.text, verificationStatus: b.verificationStatus },
      });
    }

    for (const f of facts) {
      if (f.factType === "tool" || f.factType === "technology") {
        const skillId = f.valueText.trim().toLowerCase();
        if (skillId && !nodesMap.has(skillId)) {
          nodesMap.set(skillId, {
            id: skillId,
            type: "skill",
            label: f.valueText.trim(),
            category:
              linkedCategoryBySkill.get(skillId) || classifySkillGroupName(f.valueText.trim()),
          });
        }
      }
    }

    for (const e of entries) {
      if (e.entryType === "skill") {
        const titleSkill = e.title.trim();
        const skillId = titleSkill.toLowerCase();
        if (skillId && !nodesMap.has(skillId)) {
          nodesMap.set(skillId, {
            id: skillId,
            type: "skill",
            label: titleSkill,
            category: linkedCategoryBySkill.get(skillId) || classifySkillGroupName(titleSkill),
          });
        }
      }
      if (e.entryType === "skill_group" || e.entryType === "skill") {
        const entryBullets = bullets.filter((b) => b.entryId === e.id);
        for (const b of entryBullets) {
          for (const token of this.splitSkillTokens(b.text)) {
            const skillId = token.toLowerCase();
            if (!nodesMap.has(skillId)) {
              nodesMap.set(skillId, {
                id: skillId,
                type: "skill",
                label: token,
                category:
                  e.entryType === "skill_group"
                    ? e.title
                    : linkedCategoryBySkill.get(skillId) || classifySkillGroupName(token),
              });
            }
          }
        }
      }
    }

    const nodes = Array.from(nodesMap.values());
    const evidencedSkills = nodes.filter((n) => n.type === "skill");
    const projects = nodes.filter((n) => n.type === "project");
    const experiences = nodes.filter((n) => n.type === "experience");

    return {
      nodes,
      edges: edges as CareerGraphEdge[],
      stats: {
        totalNodes: nodes.length,
        totalEdges: edges.length,
        evidencedSkillCount: evidencedSkills.length,
        projectCount: projects.length,
        experienceCount: experiences.length,
      },
    };
  }

  /**
   * Alias for getGraph to support both naming conventions
   */
  static async getCareerGraph(userId: string): Promise<CareerGraphViewData> {
    return this.getGraph(userId);
  }

  /**
   * Adds an explicit relationship edge
   */
  static async addEdge(
    userId: string,
    edgeData: {
      sourceType: string;
      sourceId: string;
      targetType: string;
      targetId: string;
      relationshipType: CareerGraphRelationType;
      weight?: number;
      metadataJson?: Record<string, unknown>;
    }
  ): Promise<CareerGraphEdge> {
    // Validate tenant ownership if sourceId points to a tenant-scoped database record
    const entryNodeTypes = new Set([
      "experience",
      "project",
      "education",
      "certification",
      "bank_entry",
      "entry",
      "skill_group",
      "award",
      "publication",
      "volunteer",
      "profile",
      "custom",
    ]);

    if (edgeData.sourceType === "achievement_bullet") {
      const b = await db
        .select({ id: achievementBullets.id })
        .from(achievementBullets)
        .where(
          and(
            eq(achievementBullets.id, edgeData.sourceId),
            eq(achievementBullets.userId, userId),
            isNull(achievementBullets.deletedAt)
          )
        )
        .limit(1);
      if (b.length === 0) throw new Error("Source achievement bullet not found or access denied");
    } else if (entryNodeTypes.has(edgeData.sourceType)) {
      const e = await db
        .select({ id: bankEntries.id })
        .from(bankEntries)
        .where(
          and(
            eq(bankEntries.id, edgeData.sourceId),
            eq(bankEntries.userId, userId),
            isNull(bankEntries.deletedAt)
          )
        )
        .limit(1);
      if (e.length === 0) throw new Error("Source bank entry not found or access denied");
    } else if (["fact", "bullet_fact"].includes(edgeData.sourceType)) {
      const f = await db
        .select({ id: bulletFacts.id })
        .from(bulletFacts)
        .where(and(eq(bulletFacts.id, edgeData.sourceId), eq(bulletFacts.userId, userId)))
        .limit(1);
      if (f.length === 0) throw new Error("Source bullet fact not found or access denied");
    }

    // Validate tenant ownership if targetId points to a tenant-scoped database record
    if (edgeData.targetType === "achievement_bullet") {
      const b = await db
        .select({ id: achievementBullets.id })
        .from(achievementBullets)
        .where(
          and(
            eq(achievementBullets.id, edgeData.targetId),
            eq(achievementBullets.userId, userId),
            isNull(achievementBullets.deletedAt)
          )
        )
        .limit(1);
      if (b.length === 0) throw new Error("Target achievement bullet not found or access denied");
    } else if (entryNodeTypes.has(edgeData.targetType)) {
      const e = await db
        .select({ id: bankEntries.id })
        .from(bankEntries)
        .where(
          and(
            eq(bankEntries.id, edgeData.targetId),
            eq(bankEntries.userId, userId),
            isNull(bankEntries.deletedAt)
          )
        )
        .limit(1);
      if (e.length === 0) throw new Error("Target bank entry not found or access denied");
    } else if (["fact", "bullet_fact"].includes(edgeData.targetType)) {
      const f = await db
        .select({ id: bulletFacts.id })
        .from(bulletFacts)
        .where(and(eq(bulletFacts.id, edgeData.targetId), eq(bulletFacts.userId, userId)))
        .limit(1);
      if (f.length === 0) throw new Error("Target bullet fact not found or access denied");
    }

    const id = `edge_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const [inserted] = await db
      .insert(careerGraphEdges)
      .values({
        id,
        userId,
        sourceType: edgeData.sourceType,
        sourceId: edgeData.sourceId,
        targetType: edgeData.targetType,
        targetId: edgeData.targetId,
        relationshipType: edgeData.relationshipType,
        weight: edgeData.weight ?? 1.0,
        metadataJson: edgeData.metadataJson,
      })
      .returning();

    return inserted as CareerGraphEdge;
  }

  /**
   * Deletes a graph edge
   */
  static async removeEdge(userId: string, edgeId: string): Promise<boolean> {
    const deleted = await db
      .delete(careerGraphEdges)
      .where(and(eq(careerGraphEdges.id, edgeId), eq(careerGraphEdges.userId, userId)))
      .returning({ id: careerGraphEdges.id });
    return deleted.length > 0;
  }

  /**
   * Alias createEdge for test and API consistency
   */
  static async createEdge(
    userId: string,
    sourceId: string,
    targetId: string,
    relationType: string,
    sourceType: string = "fact",
    targetType: string = "entry"
  ): Promise<any> {
    const edge = await this.addEdge(userId, {
      sourceType,
      sourceId,
      targetType,
      targetId,
      relationshipType: relationType as CareerGraphRelationType,
    });
    return {
      ...edge,
      relationType: (edge as any).relationshipType || relationType,
    };
  }

  /**
   * Alias deleteEdge for test and API consistency
   */
  static async deleteEdge(userId: string, edgeId: string): Promise<boolean> {
    return this.removeEdge(userId, edgeId);
  }
}
