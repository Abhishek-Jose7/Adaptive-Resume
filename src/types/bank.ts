/**
 * Data Bank Type Definitions
 * Section 6.2, 8.2 and 8.3 of PRD.md
 */

export type EntryType =
  | "profile"
  | "experience"
  | "education"
  | "project"
  | "skill_group"
  | "certification"
  | "award"
  | "publication"
  | "volunteer"
  | "custom";

export type MetricKind = "percent" | "currency" | "count" | "duration" | "scale";

export type FactType =
  | "metric"
  | "tool"
  | "technology"
  | "scope"
  | "role"
  | "outcome"
  | "date"
  | "other";

export type Visibility = "private" | "resume" | "public_eligible";

export type VerificationStatus = "unverified" | "user_verified" | "source_verified";

export type UsagePolicy = "eligible" | "never_use" | "exclude_from_job";

export interface BulletFact {
  id: string;
  userId: string;
  bulletId?: string | null;
  entryId?: string | null;
  factType: FactType;
  factKey: string;
  valueText: string;
  valueNumber?: number | null;
  valueNumeric?: number | null;
  unit?: string | null;
  currencyCode?: string | null;
  metricKind?: MetricKind | null;
  sourceEvidenceId?: string | null;
  contextSnippet?: string | null;
  confidence?: number | null;
  verificationStatus: VerificationStatus;
  createdAt: Date | string;
}

export type StructuredFact = BulletFact;


export interface AchievementBullet {
  id: string;
  userId: string;
  entryId: string;
  text: string;
  normalizedText?: string | null;
  visibility: Visibility;
  verificationStatus: VerificationStatus;
  usagePolicy: UsagePolicy;
  sortOrder: number;
  rowVersion: number;
  sourceId?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string | null;
  facts?: BulletFact[];
}

export interface BankEntry {
  id: string;
  userId: string;
  entryType: EntryType;
  title: string;
  organization?: string | null;
  location?: string | null;
  startDate?: string | null; // ISO Date YYYY-MM-DD or YYYY-MM
  endDate?: string | null;
  isCurrent: boolean;
  descriptionContext?: string | null;
  visibility: Visibility;
  verificationStatus: VerificationStatus;
  sortOrder: number;
  rowVersion: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string | null;
  bullets?: AchievementBullet[];
  facts?: BulletFact[];
}

export interface CompletenessReport {
  hasMissingMetrics: boolean;
  missingMetricBulletIds: string[];
  hasMissingDates: boolean;
  missingDateEntryIds: string[];
  hasUnevidencedSkills: boolean;
  unevidencedSkillGroupIds: string[];
}
