import { AchievementBullet, BankEntry, StructuredFact } from "@/types/bank";
import { RewrittenBullet, RewrittenBulletClaim } from "@/types/job";
import { CanaryDetector } from "../intelligence/canaryDetector";

export interface ValidationFailure {
  rule:
    | "SCHEMA_MISMATCH"
    | "NUMERIC_MUTATION"
    | "UNGROUNDED_ENTITY"
    | "UNGROUNDED_SCOPE"
    | "VERB_PROMOTION"
    | "MISSING_CLAIM_COVERAGE"
    | "ENTAILMENT_FAILURE"
    | "CROSS_EXPERIENCE_CONTAMINATION"
    | "CANARY_TRAP_TRIGGERED"
    | "UNGROUNDED_JD_KEYWORD_INJECTION";
  message: string;
  offendingToken?: string;
}

export interface ValidationResult {
  isValid: boolean;
  failures: ValidationFailure[];
  feedbackForRetry?: string;
}

// Scope terms explicitly restricted by PRD Section 10.4 unless grounded in source evidence
const RESTRICTED_SCOPE_PATTERNS = [
  /\benterprise(-grade)?\b/i,
  /\bproduction-scale\b/i,
  /\bglobal\b/i,
  /\bhigh-availability\b/i,
  /\bmission-critical\b/i,
  /\bsecure\b/i,
  /\bscalable\b/i,
  /\barchitected\b/i,
  /\bowned\b/i,
  /\bled\b/i,
  /\bspearheaded\b/i,
  /\bdirected\b/i,
  /\boptimized\b/i,
  /\bincreased\b/i,
];

// Assistive / non-leadership verbs that must never be promoted to leadership without evidence
const ASSISTIVE_VERBS = [
  /\bassisted\b/i,
  /\bhelped\b/i,
  /\bcontributed to\b/i,
  /\bsupported\b/i,
  /\bparticipated in\b/i,
  /\bworked on\b/i,
];

const PROMOTED_LEADERSHIP_VERBS = [
  /\bled\b/i,
  /\barchitected\b/i,
  /\bowned\b/i,
  /\bspearheaded\b/i,
  /\bdirected\b/i,
  /\bmanaged\b/i,
  /\bfounded\b/i,
];

export class TruthBoundValidator {
  /**
   * Validates a rewritten bullet against source evidence
   * PRD Section 10.4 & Section 18.2 (Experience Isolation)
   */
  static validate(
    rewritten: RewrittenBullet,
    candidateBullets: AchievementBullet[],
    candidateFacts: StructuredFact[],
    candidateEntries: BankEntry[] = [],
    targetEntryId?: string,
    options?: {
      quarantinedKeywords?: string[];
      targetKeywords?: string[];
    }
  ): ValidationResult {
    const failures: ValidationFailure[] = [];

    const effectiveTargetEntryId =
      targetEntryId || (candidateEntries.length === 1 ? candidateEntries[0].id : undefined);

    // Defensively normalize sourceBulletIds and sourceFactIds to prevent non-iterable crashes
    const safeBulletIds = Array.isArray(rewritten?.sourceBulletIds)
      ? rewritten.sourceBulletIds
      : candidateBullets.length > 0
      ? [candidateBullets[0].id]
      : [];
    const safeFactIds = Array.isArray(rewritten?.sourceFactIds)
      ? rewritten.sourceFactIds
      : [];

    // 1. Schema Validation & Experience Isolation: Check source IDs existence & cross-experience contamination
    const bulletMap = new Map(candidateBullets.map((b) => [b.id, b]));
    const factMap = new Map(candidateFacts.map((f) => [f.id, f]));

    for (const bId of safeBulletIds) {
      const b = bulletMap.get(bId);
      if (!b) {
        failures.push({
          rule: "SCHEMA_MISMATCH",
          message: `Referenced sourceBulletId "${bId}" does not exist in supplied candidate set.`,
          offendingToken: bId,
        });
      } else if (effectiveTargetEntryId && b.entryId && b.entryId !== effectiveTargetEntryId) {
        failures.push({
          rule: "CROSS_EXPERIENCE_CONTAMINATION",
          message: `Cross-Experience Contamination: Bullet "${bId}" belongs to entry "${b.entryId}" but target entry is "${effectiveTargetEntryId}". Experience isolation forbids citing evidence across unrelated experiences.`,
          offendingToken: bId,
        });
      }
    }

    for (const fId of safeFactIds) {
      const f = factMap.get(fId);
      if (!f) {
        failures.push({
          rule: "SCHEMA_MISMATCH",
          message: `Referenced sourceFactId "${fId}" does not exist in supplied candidate facts.`,
          offendingToken: fId,
        });
      } else if (effectiveTargetEntryId && (f as any).entryId && (f as any).entryId !== effectiveTargetEntryId) {
        failures.push({
          rule: "CROSS_EXPERIENCE_CONTAMINATION",
          message: `Cross-Experience Contamination: Fact "${fId}" belongs to an unrelated entry and cannot be transferred.`,
          offendingToken: fId,
        });
      }
    }

    if (safeBulletIds.length === 0) {
      failures.push({
        rule: "SCHEMA_MISMATCH",
        message: "Rewritten bullet must reference at least one source bullet ID.",
      });
    }

    // Build aggregate source text & facts pool for referenced evidence
    const referencedBullets = safeBulletIds
      .map((id) => bulletMap.get(id))
      .filter((b): b is AchievementBullet => Boolean(b));

    const referencedFacts = safeFactIds
      .map((id) => factMap.get(id))
      .filter((f): f is StructuredFact => Boolean(f));

    // Also include facts directly embedded in referenced bullets
    for (const b of referencedBullets) {
      if (b.facts) {
        for (const f of b.facts) {
          if (!referencedFacts.some((rf) => rf.id === f.id)) {
            referencedFacts.push(f);
          }
        }
      }
    }

    const sourceTexts = referencedBullets.map((b) => b.text);
    // Source contexts scoped strictly to target entry to avoid leaking other projects' vocabulary
    const scopedEntries = effectiveTargetEntryId
      ? candidateEntries.filter((e) => e.id === effectiveTargetEntryId)
      : candidateEntries;
    const sourceContexts = scopedEntries.map((e) => e.descriptionContext || "");
    const combinedSourceText = [...sourceTexts, ...sourceContexts].join(" ").toLowerCase();
    const combinedFactsText = referencedFacts
      .map((f) => `${f.valueNumeric ?? ""} ${f.valueText} ${f.unit || ""}`)
      .join(" ")
      .toLowerCase();

    // 2. Numeric Validation: Every number/metric in output MUST exist in source bullets or facts
    const outputNumbers = this.extractNumericTokens(rewritten.text);
    const sourceNumbers = new Set<string>();

    // Extract numbers from source bullets and facts
    for (const text of [...sourceTexts, combinedFactsText]) {
      for (const num of this.extractNumericTokens(text)) {
        sourceNumbers.add(this.normalizeNumericToken(num));
      }
    }

    for (const fact of referencedFacts) {
      if (fact.valueNumeric !== null && fact.valueNumeric !== undefined) {
        sourceNumbers.add(String(fact.valueNumeric));
        sourceNumbers.add(this.normalizeNumericToken(String(fact.valueNumeric)));
      }
      if (fact.valueText) {
        for (const num of this.extractNumericTokens(fact.valueText)) {
          sourceNumbers.add(this.normalizeNumericToken(num));
        }
      }
    }

    for (const outNum of outputNumbers) {
      const normalized = this.normalizeNumericToken(outNum);
      if (!sourceNumbers.has(normalized)) {
        failures.push({
          rule: "NUMERIC_MUTATION",
          message: `Numeric figure or metric "${outNum}" was not found in source evidence or facts.`,
          offendingToken: outNum,
        });
      }
    }

    // 3. Scope / High-impact term grounding (PRD 10.4 Rule 4)
    for (const pattern of RESTRICTED_SCOPE_PATTERNS) {
      const match = rewritten.text.match(pattern);
      if (match) {
        const term = match[0].toLowerCase();
        // Check if term exists in source evidence
        const termRegex = new RegExp(`\\b${term}\\b`, "i");
        const foundInSource =
          sourceTexts.some((t) => termRegex.test(t)) ||
          sourceContexts.some((c) => termRegex.test(c)) ||
          referencedFacts.some((f) => termRegex.test(f.valueText));

        if (!foundInSource) {
          failures.push({
            rule: "UNGROUNDED_SCOPE",
            message: `Scope or outcome claim "${term}" is not grounded in source evidence.`,
            offendingToken: term,
          });
        }
      }
    }

    // 4. Verb Promotion check (PRD 10.4 Rule 4: "assisted" -> "led")
    const sourceHasAssistiveOnly =
      ASSISTIVE_VERBS.some((v) => sourceTexts.some((t) => v.test(t))) &&
      !PROMOTED_LEADERSHIP_VERBS.some((v) => sourceTexts.some((t) => v.test(t)));

    if (sourceHasAssistiveOnly) {
      for (const leadVerb of PROMOTED_LEADERSHIP_VERBS) {
        const match = rewritten.text.match(leadVerb);
        if (match) {
          failures.push({
            rule: "VERB_PROMOTION",
            message: `Unjustified verb promotion: candidate assisted/contributed, but rewrite claims "${match[0]}".`,
            offendingToken: match[0],
          });
        }
      }
    }

    // 5. Claim Map Coverage (PRD 10.4 Rule 5)
    if (!rewritten.claimMap || rewritten.claimMap.length === 0) {
      failures.push({
        rule: "MISSING_CLAIM_COVERAGE",
        message: "No claimMap provided. Every sentence/clause must map to evidence IDs.",
      });
    } else {
      for (const claimItem of rewritten.claimMap) {
        if (!claimItem.evidenceIds || claimItem.evidenceIds.length === 0) {
          failures.push({
            rule: "MISSING_CLAIM_COVERAGE",
            message: `Claim "${claimItem.claim}" has no cited evidence IDs.`,
            offendingToken: claimItem.claim,
          });
        } else {
          for (const evId of claimItem.evidenceIds) {
            if (!bulletMap.has(evId) && !factMap.has(evId)) {
              failures.push({
                rule: "SCHEMA_MISMATCH",
                message: `Claim references unknown evidence ID "${evId}".`,
                offendingToken: evId,
              });
            }
          }
        }
      }
    }

    // 6. Recruiter Honey-Pot & Canary Trap Check
    const quarantined = options?.quarantinedKeywords || [];
    for (const qWord of quarantined) {
      if (!qWord || qWord.length < 2) continue;
      const escaped = qWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\b${escaped}\\b`, "i");
      if (regex.test(rewritten.text)) {
        failures.push({
          rule: "CANARY_TRAP_TRIGGERED",
          message: `Recruiter Honey-Pot Trap Prevented: Term "${qWord}" in rewritten bullet was detected as an intentional recruiter trap from the job description. Blocked to protect candidate from ATS auto-elimination.`,
          offendingToken: qWord,
        });
      }
    }

    // 7. Ungrounded JD Keyword Injection Check
    if (options?.targetKeywords && options.targetKeywords.length > 0) {
      for (const kw of options.targetKeywords) {
        if (!kw || kw.length < 2) continue;
        const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`\\b${escaped}\\b`, "i");
        if (regex.test(rewritten.text)) {
          // Check if this keyword is anywhere in source text, candidate entries, or facts
          const isEvidenced =
            combinedSourceText.includes(kw.toLowerCase()) ||
            scopedEntries.some(
              (e) =>
                (e.descriptionContext || "").toLowerCase().includes(kw.toLowerCase()) ||
                e.title.toLowerCase().includes(kw.toLowerCase())
            ) ||
            candidateFacts.some((f) => f.valueText.toLowerCase().includes(kw.toLowerCase()));

          if (!isEvidenced) {
            failures.push({
              rule: "UNGROUNDED_JD_KEYWORD_INJECTION",
              message: `Job description keyword "${kw}" was injected into rewritten bullet without verified evidence in candidate's Data Bank.`,
              offendingToken: kw,
            });
          }
        }
      }
    }

    // 8. Entity / Tool Grounding Check
    // Detect technology/entity terms in rewritten text not present in source
    const ungroundedEntities = this.detectUngroundedEntities(
      rewritten.text,
      combinedSourceText,
      scopedEntries,
      candidateFacts,
      options?.quarantinedKeywords
    );
    for (const ent of ungroundedEntities) {
      failures.push({
        rule: "UNGROUNDED_ENTITY",
        message: `Entity or technology "${ent}" is not present in candidate's Data Bank records.`,
        offendingToken: ent,
      });
    }

    const isValid = failures.length === 0;
    let feedbackForRetry: string | undefined;

    if (!isValid) {
      feedbackForRetry = failures
        .map((f) => `[${f.rule}] ${f.message} (Offending: ${f.offendingToken || "N/A"})`)
        .join("; ");
    }

    return {
      isValid,
      failures,
      feedbackForRetry,
    };
  }

  /**
   * Extracts numeric tokens including percentages, multipliers, currencies, durations and units
   */
  private static extractNumericTokens(text: string): string[] {
    if (!text) return [];

    // Match numbers, percentages, multipliers, currencies, metrics
    // e.g. "45%", "$100k", "3.5x", "12,000", "500ms", "10", "4.2"
    const regex =
      /(?:\$|€|£)?\b\d+(?:,\d{3})*(?:\.\d+)?(?:%|x|k|m|b|ms|s|h|yr|years|months)?\b/gi;
    const matches = text.match(regex) || [];

    // Filter out common standalone single digits that are part of standard prose (e.g. "a", "one")
    return matches.filter((m) => {
      // Must contain at least one digit
      return /\d/.test(m);
    });
  }

  /**
   * Normalizes numeric tokens for robust comparison (e.g., "$100k" -> "100k", "1,200" -> "1200")
   */
  private static normalizeNumericToken(token: string): string {
    return token
      .toLowerCase()
      .replace(/[$,€£,]/g, "")
      .trim();
  }

  /**
   * Checks for tech/tool keywords that appear in rewritten text but not anywhere in source bank
   */
  private static detectUngroundedEntities(
    rewrittenText: string,
    sourceText: string,
    candidateEntries: BankEntry[],
    candidateFacts: StructuredFact[],
    extraQuarantinedKeywords?: string[]
  ): string[] {
    // Gather all known skills, tools, and organization names from candidate's bank entries
    const bankVocabulary = new Set<string>();

    for (const entry of candidateEntries) {
      if (entry.title) {
        entry.title.toLowerCase().split(/\s+/).forEach((w) => bankVocabulary.add(w));
      }
      if (entry.organization) {
        entry.organization.toLowerCase().split(/\s+/).forEach((w) => bankVocabulary.add(w));
      }
      if (entry.descriptionContext) {
        entry.descriptionContext.toLowerCase().split(/\s+/).forEach((w) => bankVocabulary.add(w));
      }
    }

    // Also words in source text and facts
    sourceText.split(/[\s,.;:()]+/).forEach((w) => bankVocabulary.add(w.toLowerCase()));
    for (const f of candidateFacts) {
      f.valueText.split(/[\s,.;:()]+/).forEach((w) => bankVocabulary.add(w.toLowerCase()));
    }

    // Common technical tools/frameworks that models commonly hallucinate
    const commonHallucinatedTech = [
      "kubernetes",
      "docker",
      "aws",
      "azure",
      "gcp",
      "graphql",
      "kafka",
      "redis",
      "postgresql",
      "mongodb",
      "snowflake",
      "terraform",
      "react",
      "vue",
      "angular",
      "next.js",
      "python",
      "golang",
      "rust",
      "c++",
      "java",
      "spring",
      "elasticsearch",
      "spark",
      "airflow",
      "ci/cd",
      // Known decoy/canary terms commonly planted by recruiters
      "cribbage",
      "monopoly",
      "flanagandb",
      "bananascript",
      "hyperionmesh",
      ...(extraQuarantinedKeywords || []).map((k) => k.toLowerCase()),
    ];

    const ungrounded: string[] = [];
    const rewriteLower = rewrittenText.toLowerCase();

    for (const tech of commonHallucinatedTech) {
      const escapedTech = tech.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const techRegex = new RegExp(`(?:^|[^a-zA-Z0-9])${escapedTech}(?:$|[^a-zA-Z0-9])`, "i");
      if (techRegex.test(rewriteLower)) {
        if (!bankVocabulary.has(tech) && !sourceText.includes(tech)) {
          ungrounded.push(tech);
        }
      }
    }

    return ungrounded;
  }
}
