import { BankEntry, CompletenessReport } from "../../types/bank";

/**
 * Data Bank Completeness Auditing Service
 * PRD Section 6.2 B3: Detects bullets without metrics, entries without dates, and skills without evidence.
 */
export class CompletenessService {
  static auditBankEntries(entries: BankEntry[]): CompletenessReport {
    const missingMetricBulletIds: string[] = [];
    const missingDateEntryIds: string[] = [];
    const unevidencedSkillGroupIds: string[] = [];

    // Collect all tool/technology/skill facts across all entries to cross-check evidence
    const allEvidencedSkills = new Set<string>();

    for (const entry of entries) {
      // 1. Audit dates for experience and education entries
      if (entry.entryType === "experience" || entry.entryType === "education") {
        if (!entry.startDate && !entry.isCurrent) {
          missingDateEntryIds.push(entry.id);
        }
      }

      // Collect evidence from facts
      if (entry.facts) {
        for (const fact of entry.facts) {
          if (fact.factType === "tool" || fact.factType === "technology") {
            allEvidencedSkills.add(fact.valueText.toLowerCase().trim());
          }
        }
      }

      // 2. Audit bullets for metrics
      if (entry.bullets) {
        for (const bullet of entry.bullets) {
          let hasMetric = false;

          // Check if bullet has a metric fact
          if (bullet.facts && bullet.facts.some((f) => f.factType === "metric" || f.valueNumber != null)) {
            hasMetric = true;
          } else {
            // Regex check for numeric patterns (% or $ or digits) in bullet text
            const hasNumeric = /\b\d+(\.\d+)?%|\$\d+|\b\d+\b/.test(bullet.text);
            if (hasNumeric) {
              hasMetric = true;
            }
          }

          if (!hasMetric) {
            missingMetricBulletIds.push(bullet.id);
          }

          // Also collect tools/technologies mentioned in bullet facts
          if (bullet.facts) {
            for (const f of bullet.facts) {
              if (f.factType === "tool" || f.factType === "technology") {
                allEvidencedSkills.add(f.valueText.toLowerCase().trim());
              }
            }
          }
        }
      }
    }

    // 3. Audit skill groups for evidence
    for (const entry of entries) {
      if (entry.entryType === "skill_group") {
        // Look at title and bullets/facts
        const skillGroupName = entry.title.toLowerCase();
        let groupHasEvidence = false;

        // Check if any evidenced skill matches or if bullets in this skill group have evidence
        if (entry.bullets && entry.bullets.length > 0) {
          for (const b of entry.bullets) {
            const skillName = b.text.toLowerCase().trim();
            if (allEvidencedSkills.has(skillName)) {
              groupHasEvidence = true;
              break;
            }
          }
        } else if (allEvidencedSkills.has(skillGroupName)) {
          groupHasEvidence = true;
        }

        if (!groupHasEvidence) {
          unevidencedSkillGroupIds.push(entry.id);
        }
      }
    }

    return {
      hasMissingMetrics: missingMetricBulletIds.length > 0,
      missingMetricBulletIds,
      hasMissingDates: missingDateEntryIds.length > 0,
      missingDateEntryIds,
      hasUnevidencedSkills: unevidencedSkillGroupIds.length > 0,
      unevidencedSkillGroupIds,
    };
  }
}
