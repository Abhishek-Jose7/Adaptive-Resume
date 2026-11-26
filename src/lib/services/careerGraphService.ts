import { db } from "@/lib/db/client";
import {
  careerGraphEdges,
  bankEntries,
  achievementBullets,
  bulletFacts,
} from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { CareerGraphEdge, CareerGraphRelationType } from "@/types/bank";

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
  /**
   * Synchronizes Career Graph edges from the user's existing Data Bank records
   */
  static async syncBankToGraph(userId: string): Promise<number> {
    const [entries, bullets, facts] = await Promise.all([
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

    for (const entry of entries) {
      const entryBullets = bulletsByEntry.get(entry.id) || [];
      for (const b of entryBullets) {
        edgesToInsert.push({
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
          edgesToInsert.push({
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
            edgesToInsert.push({
              id: `edge_ent_tool_${entry.id}_${f.factKey}`,
              userId,
              sourceType: entry.entryType,
              sourceId: entry.id,
              targetType: "skill",
              targetId: f.valueText.toLowerCase(),
              relationshipType: "used_skill",
              weight: 1.0,
              metadataJson: { skillName: f.valueText, sourceEntryTitle: entry.title },
            });
          }
        }
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
        const skillId = f.valueText.toLowerCase();
        if (!nodesMap.has(skillId)) {
          nodesMap.set(skillId, {
            id: skillId,
            type: "skill",
            label: f.valueText,
            category: "skill",
          });
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
