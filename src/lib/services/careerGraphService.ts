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
    const entries = await db
      .select()
      .from(bankEntries)
      .where(and(eq(bankEntries.userId, userId), isNull(bankEntries.deletedAt)));

    const bullets = await db
      .select()
      .from(achievementBullets)
      .where(and(eq(achievementBullets.userId, userId), isNull(achievementBullets.deletedAt)));

    const facts = await db
      .select()
      .from(bulletFacts)
      .where(eq(bulletFacts.userId, userId));

    let createdEdges = 0;

    for (const entry of entries) {
      // Connect entry to its bullets
      const entryBullets = bullets.filter((b) => b.entryId === entry.id);
      for (const b of entryBullets) {
        const edgeId = `edge_ent_b_${entry.id}_${b.id}`;
        await db
          .insert(careerGraphEdges)
          .values({
            id: edgeId,
            userId,
            sourceType: entry.entryType,
            sourceId: entry.id,
            targetType: "achievement_bullet",
            targetId: b.id,
            relationshipType: "produced_outcome",
            weight: 1.0,
            metadataJson: { bulletTextSnippet: b.text.slice(0, 80) },
          })
          .onConflictDoNothing();
        createdEdges++;

        // Connect bullet to its facts
        const bFacts = facts.filter((f) => f.bulletId === b.id);
        for (const f of bFacts) {
          const factEdgeId = `edge_b_fact_${b.id}_${f.id}`;
          await db
            .insert(careerGraphEdges)
            .values({
              id: factEdgeId,
              userId,
              sourceType: "achievement_bullet",
              sourceId: b.id,
              targetType: f.factType,
              targetId: f.id,
              relationshipType: "demonstrated_competency",
              weight: 1.0,
              metadataJson: { factKey: f.factKey, valueText: f.valueText },
            })
            .onConflictDoNothing();
          createdEdges++;

          // If tool or tech, connect entry directly to skill/tool
          if (f.factType === "tool" || f.factType === "technology") {
            const skillEdgeId = `edge_ent_tool_${entry.id}_${f.factKey}`;
            await db
              .insert(careerGraphEdges)
              .values({
                id: skillEdgeId,
                userId,
                sourceType: entry.entryType,
                sourceId: entry.id,
                targetType: "skill",
                targetId: f.valueText.toLowerCase(),
                relationshipType: "used_skill",
                weight: 1.0,
                metadataJson: { skillName: f.valueText, sourceEntryTitle: entry.title },
              })
              .onConflictDoNothing();
            createdEdges++;
          }
        }
      }
    }

    return createdEdges;
  }

  /**
   * Retrieves the user's complete Career Graph view for rendering and analysis
   */
  static async getGraph(userId: string): Promise<CareerGraphViewData> {
    const edges = await db
      .select()
      .from(careerGraphEdges)
      .where(eq(careerGraphEdges.userId, userId));

    const entries = await db
      .select()
      .from(bankEntries)
      .where(and(eq(bankEntries.userId, userId), isNull(bankEntries.deletedAt)));

    const bullets = await db
      .select()
      .from(achievementBullets)
      .where(and(eq(achievementBullets.userId, userId), isNull(achievementBullets.deletedAt)));

    const facts = await db
      .select()
      .from(bulletFacts)
      .where(eq(bulletFacts.userId, userId));

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
