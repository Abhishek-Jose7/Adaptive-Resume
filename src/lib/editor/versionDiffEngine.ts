import { ResumeDoc, ResumeVersionDiff, BulletDiffItem, DiffChangeType } from "@/types/resume";

export class VersionDiffEngine {
  /**
   * Computes a granular section-by-section and bullet-by-bullet diff between two ResumeDoc versions.
   */
  static computeDiff(
    baseDoc: ResumeDoc,
    targetDoc: ResumeDoc,
    baseVersionNumber: number = 1,
    targetVersionNumber: number = 2
  ): ResumeVersionDiff {
    // 1. Profile changes
    const profileChanges: Array<{ field: string; before?: string; after?: string }> = [];
    const fields: Array<keyof typeof baseDoc.profile> = [
      "name",
      "fullName",
      "headline",
      "summary",
      "email",
      "phone",
      "location",
    ];

    for (const f of fields) {
      const bVal = (baseDoc.profile as any)?.[f];
      const tVal = (targetDoc.profile as any)?.[f];
      if (bVal !== tVal) {
        profileChanges.push({
          field: String(f),
          before: bVal ? String(bVal) : undefined,
          after: tVal ? String(tVal) : undefined,
        });
      }
    }

    // 2. Experience Bullets comparison
    const baseBulletsMap = new Map<string, { text: string; sourceBulletIds?: string[]; sourceFactIds?: string[] }>();
    for (const exp of baseDoc.experience || []) {
      for (const b of exp.bullets || []) {
        baseBulletsMap.set(b.id, {
          text: b.text,
          sourceBulletIds: b.sourceBulletIds,
          sourceFactIds: b.sourceFactIds,
        });
      }
    }

    const targetBulletsMap = new Map<string, { text: string; sourceBulletIds?: string[]; sourceFactIds?: string[]; section: string }>();
    for (const exp of targetDoc.experience || []) {
      for (const b of exp.bullets || []) {
        targetBulletsMap.set(b.id, {
          text: b.text,
          sourceBulletIds: b.sourceBulletIds,
          sourceFactIds: b.sourceFactIds,
          section: exp.company || "Experience",
        });
      }
    }

    // Also check projects
    for (const proj of baseDoc.projects || []) {
      for (const b of proj.bullets || []) {
        baseBulletsMap.set(b.id, {
          text: b.text,
          sourceBulletIds: b.sourceBulletIds,
          sourceFactIds: b.sourceFactIds,
        });
      }
    }
    for (const proj of targetDoc.projects || []) {
      for (const b of proj.bullets || []) {
        targetBulletsMap.set(b.id, {
          text: b.text,
          sourceBulletIds: b.sourceBulletIds,
          sourceFactIds: b.sourceFactIds,
          section: proj.name || "Projects",
        });
      }
    }

    // Also check sections array (PRD Section 8.7 canonical format)
    for (const sec of (baseDoc.sections as any) || []) {
      for (const item of sec.items || sec.entries || []) {
        for (const b of item.bullets || []) {
          baseBulletsMap.set(b.id, {
            text: b.text,
            sourceBulletIds: b.sourceBulletIds,
            sourceFactIds: b.sourceFactIds,
          });
        }
      }
    }

    for (const sec of (targetDoc.sections as any) || []) {
      for (const item of sec.items || sec.entries || []) {
        for (const b of item.bullets || []) {
          targetBulletsMap.set(b.id, {
            text: b.text,
            sourceBulletIds: b.sourceBulletIds,
            sourceFactIds: b.sourceFactIds,
            section: sec.heading || sec.title || item.title || "Section",
          });
        }
      }
    }

    const bulletChanges: any[] = [];
    let addedCount = 0;
    let removedCount = 0;
    let modifiedCount = 0;
    let unchangedCount = 0;

    // Check all target bullets
    for (const [id, targetItem] of targetBulletsMap.entries()) {
      const baseItem = baseBulletsMap.get(id);

      if (!baseItem) {
        // Bullet was added
        addedCount++;
        bulletChanges.push({
          id,
          section: targetItem.section,
          sectionTitle: targetItem.section,
          changeType: "added",
          type: "added",
          currentText: targetItem.text,
          targetText: targetItem.text,
          sourceBulletIds: targetItem.sourceBulletIds,
          sourceFactIds: targetItem.sourceFactIds,
          provenanceSources: targetItem.sourceBulletIds || [],
        });
      } else if (baseItem.text.trim() !== targetItem.text.trim()) {
        // Bullet was modified / rewritten
        modifiedCount++;
        bulletChanges.push({
          id,
          section: targetItem.section,
          sectionTitle: targetItem.section,
          changeType: "modified",
          type: "modified",
          originalText: baseItem.text,
          baseText: baseItem.text,
          currentText: targetItem.text,
          targetText: targetItem.text,
          sourceBulletIds: targetItem.sourceBulletIds,
          sourceFactIds: targetItem.sourceFactIds,
          provenanceSources: targetItem.sourceBulletIds || [],
        });
      } else {
        // Unchanged
        unchangedCount++;
        bulletChanges.push({
          id,
          section: targetItem.section,
          sectionTitle: targetItem.section,
          changeType: "unchanged",
          type: "unchanged",
          originalText: baseItem.text,
          baseText: baseItem.text,
          currentText: targetItem.text,
          targetText: targetItem.text,
          sourceBulletIds: targetItem.sourceBulletIds,
          sourceFactIds: targetItem.sourceFactIds,
          provenanceSources: targetItem.sourceBulletIds || [],
        });
      }
    }

    // Check for removed bullets
    for (const [id, baseItem] of baseBulletsMap.entries()) {
      if (!targetBulletsMap.has(id)) {
        removedCount++;
        bulletChanges.push({
          id,
          section: "Removed",
          sectionTitle: "Removed",
          changeType: "removed",
          type: "deleted",
          originalText: baseItem.text,
          baseText: baseItem.text,
          sourceBulletIds: baseItem.sourceBulletIds,
          sourceFactIds: baseItem.sourceFactIds,
          provenanceSources: baseItem.sourceBulletIds || [],
        });
      }
    }

    const summaryStats = {
      addedCount,
      removedCount,
      deletedCount: removedCount,
      modifiedCount,
      unchangedCount,
    };

    return {
      baseVersionId: baseDoc.versionId,
      targetVersionId: targetDoc.versionId,
      baseVersionNumber,
      targetVersionNumber,
      profileChanges,
      bulletChanges,
      bullets: bulletChanges,
      stats: summaryStats,
      summary: summaryStats,
    } as any;
  }
}
