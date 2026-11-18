/**
 * Job and JD Analysis Type Definitions
 * Appendix A, Section 6.4, 6.5, 10.4 and 10.5 of PRD.md
 */

export interface JobRecord {
  id: string;
  userId: string;
  title?: string | null;
  company?: string | null;
  location?: string | null;
  sourceUrl?: string | null;
  rawText: string;
  contentHash: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export type SeniorityLevel =
  | "intern"
  | "entry"
  | "junior"
  | "mid"
  | "senior"
  | "lead"
  | "manager"
  | "director"
  | "executive"
  | "unknown";

export type WorkMode = "onsite" | "hybrid" | "remote" | "unknown";

export type KeywordCategory =
  | "technical_skill"
  | "tool"
  | "domain"
  | "responsibility"
  | "soft_skill"
  | "credential"
  | "other";

export type PriorityLevel = "must_have" | "nice_to_have";

export type UserOverride = "none" | "promoted" | "demoted" | "removed";

export interface JDKeyword {
  id: string;
  canonical: string;
  synonyms: string[];
  category: KeywordCategory;
  priority: PriorityLevel;
  importance: number; // 0 to 1
  evidencePhrase: string | null;
  userOverride: UserOverride;
}

export interface JDResponsibility {
  id: string;
  text: string;
  priority: PriorityLevel;
  keywords: string[];
}

export interface JDAnalysis {
  schemaVersion: 1;
  role: {
    title: string | null;
    company: string | null;
    seniority: SeniorityLevel;
    domain: string[];
    location: string | null;
    workMode: WorkMode;
    yearsExperience: {
      min: number | null;
      max: number | null;
    };
    education: string[];
  };
  keywords: JDKeyword[];
  responsibilities: JDResponsibility[];
  constraints: string[];
  ambiguityFlags: string[];
  confidence: number;
  sourceTextHash: string;
  promptVersion: string;
}

export interface RewrittenBulletClaim {
  claim: string;
  evidenceIds: string[];
  claimType: "action" | "tool" | "metric" | "scope" | "outcome" | "date" | "other";
}

export interface RewrittenBullet {
  text: string;
  sourceBulletIds: string[];
  sourceFactIds: string[];
  claimMap: RewrittenBulletClaim[];
  validatorStatus: "passed" | "rejected" | "not_applicable";
  validationNotes?: string[];
}

export interface MatchScoreDimension {
  dimension: string;
  score: number;
  maxScore: number;
  weight: number;
  details: string;
}

export interface ResumeMatchScore {
  overallScore: number; // 0 to 100
  dimensions: MatchScoreDimension[];
  missingMustHaves: string[];
  missingNiceToHaves: string[];
  parseabilityIssues: string[];
  scoringVersion: string;
}

export interface GapReportItem {
  keyword: string;
  category: KeywordCategory;
  priority: PriorityLevel;
  status: "in_bank_unused" | "not_in_bank";
  action: string;
  bankBulletId?: string;
}

export interface GapReport {
  items: GapReportItem[];
  totalGaps: number;
  inBankUnusedCount: number;
  notInBankCount: number;
}
