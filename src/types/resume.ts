/**
 * Canonical ResumeDoc Type Definition
 * Section 8.7 of PRD.md (Single source of truth for resume representation)
 */

export type ProvenanceType = "bank" | "ai-rewrite" | "manual";
export type ValidatorStatus = "passed" | "not_applicable" | "rejected";
export type PageSize = "A4" | "LETTER";

export interface ResumeBulletDoc {
  id: string;
  text: string;
  provenance: ProvenanceType;
  sourceBulletIds: string[];
  sourceFactIds: string[];
  validatorStatus: ValidatorStatus;
  pinned?: boolean;
}

export interface ResumeItemDoc {
  id: string;
  sourceEntryId?: string;
  sourceBulletIds: string[];
  title?: string;
  organization?: string;
  dates?: {
    start?: string;
    end?: string;
    current?: boolean;
  };
  location?: string;
  bullets: ResumeBulletDoc[];
}

export interface ResumeSectionDoc {
  id: string;
  type: string; // 'experience' | 'education' | 'projects' | 'skills' | 'certifications' | 'awards' | 'publications' | 'volunteer' | 'custom'
  heading: string;
  visible: boolean;
  items: ResumeItemDoc[];
}

export interface ResumeProfileDoc {
  name: string;
  fullName?: string;
  headline?: string;
  summary?: string;
  email?: string;
  phone?: string;
  location?: string;
  links: Array<{ label: string; url: string }>;
}

export type ResumeProfile = ResumeProfileDoc;
export type ResumeBullet = ResumeBulletDoc;

export interface ResumeExperience {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate?: string | null;
  isCurrent?: boolean;
  location?: string;
  bullets: ResumeBulletDoc[];
}

export interface ResumeEducation {
  id: string;
  institution: string;
  degree?: string;
  field?: string;
  startDate: string;
  endDate?: string;
}

export interface ResumeSkill {
  name: string;
  category?: string;
}

export interface ResumeProject {
  id: string;
  name: string;
  role?: string;
  url?: string;
  description?: string;
  bullets: ResumeBulletDoc[];
}

export interface ResumeCertification {
  id: string;
  name: string;
  issuer: string;
  issueDate?: string;
}

export interface ResumeTemplateDoc {
  id: string;
  version: string;
  theme: {
    fontFamily?: string;
    baseFontSizePt?: number;
    headingScale?: number;
    accentColor?: string;
    spacingDensity?: "compact" | "normal" | "spacious";
    marginsMm?: number;
    dividerStyle?: "none" | "solid" | "dashed" | "accent";
    dateAlignment?: "right" | "below";
    bulletGlyph?: "disc" | "circle" | "square" | "hyphen";
    sectionOrder?: string[];
    [key: string]: unknown;
  };
}

export interface ResumePageDoc {
  size: PageSize;
  targetPages: number;
}

export interface ResumeMetadataDoc {
  createdAt: string;
  updatedAt?: string;
  jdHash?: string;
  promptVersion?: string;
}

export interface ResumeDoc {
  schemaVersion: 1;
  documentId: string;
  versionId: string;
  jobId?: string;
  profile: ResumeProfileDoc;
  sections: ResumeSectionDoc[];
  template: ResumeTemplateDoc;
  page: ResumePageDoc;
  metadata: ResumeMetadataDoc;
  experience?: ResumeExperience[];
  education?: ResumeEducation[];
  skills?: ResumeSkill[];
  projects?: ResumeProject[];
  certifications?: ResumeCertification[];
}

// Section 18.5: Resume Version Diff
export type DiffChangeType = "added" | "removed" | "modified" | "unchanged";

export interface BulletDiffItem {
  id: string;
  section: string;
  changeType: DiffChangeType;
  originalText?: string;
  currentText?: string;
  sourceBulletIds?: string[];
  sourceFactIds?: string[];
  claimMap?: Array<{
    claim: string;
    evidenceIds: string[];
    claimType: string;
  }>;
}

export interface ResumeVersionDiff {
  baseVersionId: string;
  targetVersionId: string;
  baseVersionNumber: number;
  targetVersionNumber: number;
  profileChanges: Array<{ field: string; before?: string; after?: string }>;
  bulletChanges: BulletDiffItem[];
  bullets?: BulletDiffItem[];
  profileDiff?: any;
  stats: {
    addedCount: number;
    removedCount: number;
    modifiedCount: number;
    unchangedCount: number;
  };
  summary?: {
    addedCount: number;
    removedCount: number;
    modifiedCount: number;
    unchangedCount: number;
  };
}

// Section 18.7: Resume Pre-Export Quality Gate
export interface QualityGateAuditResult {
  passed: boolean;
  score: number; // 0 to 100
  exportBlocked: boolean;
  errors?: Array<{
    rule: string;
    message: string;
    section?: string;
    bulletId?: string;
  }>;
  criticalErrors: Array<{
    rule: string;
    message: string;
    section?: string;
    bulletId?: string;
  }>;
  warnings: Array<{
    rule: string;
    message: string;
    section?: string;
    bulletId?: string;
  }>;
  passedChecks: string[];
  pdfBinaryValid?: boolean;
  docxBinaryValid?: boolean;
}


