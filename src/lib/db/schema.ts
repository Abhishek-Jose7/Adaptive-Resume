import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  doublePrecision,
  jsonb,
  date,
  index,
  uniqueIndex,
  customType,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Custom tsvector type for PostgreSQL full-text search
const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

// ==========================================
// 1. Users table (App-local user mapped to Clerk subject)
// ==========================================
export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(), // ULID or UUID
    clerkSubject: text("clerk_subject").notNull().unique(),
    username: text("username").unique(),
    displayName: text("display_name"),
    email: text("email"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("users_username_idx").on(table.username),
    index("users_email_idx").on(table.email),
  ]
);

// ==========================================
// 2. Data Bank Entries
// ==========================================
export const bankEntries = pgTable(
  "bank_entries",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    entryType: text("entry_type").notNull(), // profile, experience, education, project, skill_group, certification, award, publication, volunteer, custom
    title: text("title").notNull(),
    organization: text("organization"),
    location: text("location"),
    startDate: date("start_date"),
    endDate: date("end_date"),
    isCurrent: boolean("is_current").notNull().default(false),
    descriptionContext: text("description_context"),
    visibility: text("visibility").notNull().default("private"), // private, resume, public_eligible
    verificationStatus: text("verification_status").notNull().default("unverified"), // unverified, user_verified, source_verified
    sortOrder: integer("sort_order").notNull().default(0),
    rowVersion: integer("row_version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    searchVector: tsvector("search_vector"),
  },
  (table) => [
    index("bank_entries_user_type_updated_idx")
      .on(table.userId, table.entryType, table.updatedAt, table.id)
      .where(sql`deleted_at IS NULL`),
    index("bank_entries_user_updated_idx")
      .on(table.userId, table.updatedAt, table.id)
      .where(sql`deleted_at IS NULL`),
    index("bank_entries_search_vector_idx")
      .using("gin", table.searchVector)
      .where(sql`deleted_at IS NULL`),
  ]
);

// ==========================================
// 3. Achievement Bullets (Atomic claims)
// ==========================================
export const achievementBullets = pgTable(
  "achievement_bullets",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    entryId: text("entry_id")
      .notNull()
      .references(() => bankEntries.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    normalizedText: text("normalized_text"),
    visibility: text("visibility").notNull().default("private"),
    verificationStatus: text("verification_status").notNull().default("unverified"),
    usagePolicy: text("usage_policy").notNull().default("eligible"), // eligible, never_use, exclude_from_job
    sortOrder: integer("sort_order").notNull().default(0),
    rowVersion: integer("row_version").notNull().default(1),
    sourceId: text("source_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    searchVector: tsvector("search_vector"),
  },
  (table) => [
    index("achievement_bullets_user_entry_sort_idx")
      .on(table.userId, table.entryId, table.sortOrder, table.id)
      .where(sql`deleted_at IS NULL`),
    index("achievement_bullets_search_vector_idx")
      .using("gin", table.searchVector)
      .where(sql`deleted_at IS NULL`),
  ]
);

// ==========================================
// 4. Bullet Facts (Typed metrics, tools, scopes)
// ==========================================
export const bulletFacts = pgTable(
  "bullet_facts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bulletId: text("bullet_id").references(() => achievementBullets.id, { onDelete: "cascade" }),
    entryId: text("entry_id").references(() => bankEntries.id, { onDelete: "cascade" }),
    factType: text("fact_type").notNull(), // metric, tool, technology, scope, role, outcome, date, other
    factKey: text("fact_key").notNull(),
    valueText: text("value_text").notNull(),
    valueNumber: doublePrecision("value_number"),
    unit: text("unit"),
    currencyCode: text("currency_code"),
    metricKind: text("metric_kind"), // percent, currency, count, duration, scale
    sourceEvidenceId: text("source_evidence_id"),
    verificationStatus: text("verification_status").notNull().default("unverified"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("bullet_facts_user_bullet_idx").on(table.userId, table.bulletId),
    index("bullet_facts_user_entry_idx").on(table.userId, table.entryId),
  ]
);

// ==========================================
// 5. Bullet Relations
// ==========================================
export const bulletRelations = pgTable(
  "bullet_relations",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sourceBulletId: text("source_bullet_id")
      .notNull()
      .references(() => achievementBullets.id, { onDelete: "cascade" }),
    targetBulletId: text("target_bullet_id")
      .notNull()
      .references(() => achievementBullets.id, { onDelete: "cascade" }),
    relationType: text("relation_type").notNull(), // supports, related_to, derived_from
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("bullet_relations_user_source_idx").on(table.userId, table.sourceBulletId),
    index("bullet_relations_user_target_idx").on(table.userId, table.targetBulletId),
  ]
);

// ==========================================
// 6. Sources & Provenance Evidence
// ==========================================
export const sources = pgTable(
  "sources",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sourceType: text("source_type").notNull(), // manual, resume_upload, linkedin_export, linkedin_text, linkedin_oauth, github, free_text, user_edit, ai_generated
    sourceLabel: text("source_label"),
    sourceUrl: text("source_url"),
    sourceHash: text("source_hash"),
    parserVersion: text("parser_version"),
    retentionPolicy: text("retention_policy").default("discard_raw"),
    importedAt: timestamp("imported_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("sources_user_created_idx").on(table.userId, table.createdAt)]
);

export const sourceEvidence = pgTable(
  "source_evidence",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    sourceLocator: text("source_locator"), // page, section, CSV filename/row, GitHub repo
    snippet: text("snippet"),
    contentHash: text("content_hash"),
    confidence: doublePrecision("confidence"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("source_evidence_user_source_idx").on(table.userId, table.sourceId)]
);

// ==========================================
// 7. Import Batches & Staged Items
// ==========================================
export const importBatches = pgTable(
  "import_batches",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sourceId: text("source_id").references(() => sources.id, { onDelete: "cascade" }),
    batchStatus: text("batch_status").notNull().default("staged"), // staged, processing, committed, rejected
    totalItems: integer("total_items").notNull().default(0),
    stagedItemsCount: integer("staged_items_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("import_batches_user_created_idx").on(table.userId, table.createdAt)]
);

export const stagedItems = pgTable(
  "staged_items",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    batchId: text("batch_id")
      .notNull()
      .references(() => importBatches.id, { onDelete: "cascade" }),
    entryType: text("entry_type").notNull(),
    rawSnippet: text("raw_snippet"),
    parsedDataJson: jsonb("parsed_data_json").notNull(),
    confidence: doublePrecision("confidence").default(1.0),
    status: text("status").notNull().default("pending"), // pending, accepted, rejected, edited
    resolvedEntryId: text("resolved_entry_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("staged_items_user_batch_status_idx").on(table.userId, table.batchId, table.status),
  ]
);

// ==========================================
// 8. Jobs & JD Analyses
// ==========================================
export const jobs = pgTable(
  "jobs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title"),
    company: text("company"),
    location: text("location"),
    sourceUrl: text("source_url"),
    rawText: text("raw_text").notNull(),
    contentHash: text("content_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("jobs_user_created_idx").on(table.userId, table.createdAt),
    index("jobs_user_hash_idx").on(table.userId, table.contentHash),
  ]
);

export const jdAnalyses = pgTable(
  "jd_analyses",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    jobId: text("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    analysisJson: jsonb("analysis_json").notNull(),
    confidence: doublePrecision("confidence").default(0.8),
    promptVersion: text("prompt_version").notNull().default("v1"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("jd_analyses_user_job_idx").on(table.userId, table.jobId)]
);

// ==========================================
// 9. Resumes & Immutable Versions
// ==========================================
export const resumeDocuments = pgTable(
  "resume_documents",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    baseResumeId: text("base_resume_id"),
    jobId: text("job_id").references(() => jobs.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("resume_documents_user_updated_idx").on(table.userId, table.updatedAt)]
);

export const resumeVersions = pgTable(
  "resume_versions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    resumeDocumentId: text("resume_document_id")
      .notNull()
      .references(() => resumeDocuments.id, { onDelete: "cascade" }),
    parentVersionId: text("parent_version_id"),
    versionNumber: integer("version_number").notNull(),
    versionKind: text("version_kind").notNull(), // base, working, ai_revision, user_revision, final, published_snapshot
    resumeDocJson: jsonb("resume_doc_json").notNull(),
    contentHash: text("content_hash").notNull(),
    templateId: text("template_id").notNull().default("classic-ats"),
    templateVersion: text("template_version").notNull().default("1.0"),
    themeJson: jsonb("theme_json").notNull().default({}),
    pageSize: text("page_size").notNull().default("A4"),
    targetPages: integer("target_pages").notNull().default(1),
    createdBy: text("created_by").notNull().default("user"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    finalizedAt: timestamp("finalized_at", { withTimezone: true }),
    immutableAt: timestamp("immutable_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("resume_versions_user_doc_num_idx").on(
      table.userId,
      table.resumeDocumentId,
      table.versionNumber
    ),
    index("resume_versions_user_document_version_idx").on(
      table.userId,
      table.resumeDocumentId,
      table.versionNumber
    ),
  ]
);

// ==========================================
// 10. Application Tracker
// ==========================================
export const applications = pgTable(
  "applications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    jobId: text("job_id").references(() => jobs.id, { onDelete: "set null" }),
    resumeVersionId: text("resume_version_id").references(() => resumeVersions.id, {
      onDelete: "set null",
    }),
    status: text("status").notNull().default("Saved"), // Saved, Applied, Screening, Interview, Offer, Rejected, Withdrawn
    appliedAt: timestamp("applied_at", { withTimezone: true }),
    followUpAt: timestamp("follow_up_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("applications_user_status_followup_idx").on(
      table.userId,
      table.status,
      table.followUpAt,
      table.id
    ),
  ]
);

// ==========================================
// 11. Cover Letters
// ==========================================
export const coverLetters = pgTable(
  "cover_letters",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    jobId: text("job_id").references(() => jobs.id, { onDelete: "set null" }),
    applicationId: text("application_id").references(() => applications.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    content: text("content").notNull(),
    tone: text("tone").notNull().default("professional"), // professional, concise, formal, conversational
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("cover_letters_user_job_idx").on(table.userId, table.jobId)]
);

// ==========================================
// 12. AI Runs Telemetry & Audit
// ==========================================
export const aiRuns = pgTable(
  "ai_runs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    taskType: text("task_type").notNull(), // parse_resume, parse_jd, analyze_jd, rewrite, cover_letter, vision
    jobId: text("job_id"),
    resumeVersionId: text("resume_version_id"),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    promptVersion: text("prompt_version").notNull(),
    tokensIn: integer("tokens_in").default(0),
    tokensOut: integer("tokens_out").default(0),
    validatorReportJson: jsonb("validator_report_json"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("ai_runs_user_task_created_idx").on(table.userId, table.taskType, table.createdAt)]
);

// ==========================================
// 13. Provider Credentials (BYOK - Encrypted at rest)
// ==========================================
export const providerCredentials = pgTable(
  "provider_credentials",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(), // gemini, groq, openai_compatible
    encryptedApiKey: text("encrypted_api_key").notNull(),
    keyNonce: text("key_nonce").notNull(),
    keyVersion: integer("key_version").notNull().default(1),
    last4: text("last_4").notNull(),
    isValid: boolean("is_valid").notNull().default(true),
    lastTestedAt: timestamp("last_tested_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("provider_credentials_user_provider_idx").on(table.userId, table.provider),
  ]
);

// ==========================================
// 14. Share Links & Expiring Snapshots
// ==========================================
export const shareLinks = pgTable(
  "share_links",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    resumeVersionId: text("resume_version_id")
      .notNull()
      .references(() => resumeVersions.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    scopeJson: jsonb("scope_json").notNull(),
    redactionsJson: jsonb("redactions_json").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("share_links_user_expiry_idx")
      .on(table.userId, table.expiresAt)
      .where(sql`revoked_at IS NULL`),
  ]
);

// ==========================================
// 15. Audit Events
// ==========================================
export const auditEvents = pgTable(
  "audit_events",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    action: text("action").notNull(), // publish, unpublish, share_created, share_revoked, byok_added, account_export, account_deleted
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id"),
    metadataJson: jsonb("metadata_json"),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("audit_events_user_action_idx").on(table.userId, table.action, table.createdAt)]
);

// ==========================================
// 16. Background / Resumable Jobs
// ==========================================
export const backgroundJobs = pgTable(
  "background_jobs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    taskType: text("task_type").notNull(),
    inputRef: text("input_ref"),
    progressStage: text("progress_stage").notNull().default("queued"),
    status: text("status").notNull().default("queued"), // queued, running, succeeded, failed, cancelled, needs_user_action
    attemptCount: integer("attempt_count").notNull().default(0),
    idempotencyKey: text("idempotency_key"),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
    lastErrorCode: text("last_error_code"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("background_jobs_user_status_idx").on(table.userId, table.status, table.leaseExpiresAt),
    uniqueIndex("background_jobs_idempotency_idx")
      .on(table.userId, table.idempotencyKey)
      .where(sql`idempotency_key IS NOT NULL`),
  ]
);

// ==========================================
// 17. Career Graph Edges (Section 18.3)
// ==========================================
export const careerGraphEdges = pgTable(
  "career_graph_edges",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sourceType: text("source_type").notNull(), // experience, project, education, skill
    sourceId: text("source_id").notNull(),
    targetType: text("target_type").notNull(), // skill, tool, achievement_bullet, fact, evidence
    targetId: text("target_id").notNull(),
    relationshipType: text("relationship_type").notNull(), // used_skill, produced_outcome, demonstrated_competency, verified_by
    weight: doublePrecision("weight").default(1.0),
    metadataJson: jsonb("metadata_json"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("career_graph_user_source_idx").on(table.userId, table.sourceType, table.sourceId),
    index("career_graph_user_target_idx").on(table.userId, table.targetType, table.targetId),
    index("career_graph_user_rel_idx").on(table.userId, table.relationshipType),
  ]
);

// ==========================================
// 18. Project Metadata & Maturity (Section 18.11)
// ==========================================
export const projectMetadata = pgTable(
  "project_metadata",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    entryId: text("entry_id")
      .notNull()
      .references(() => bankEntries.id, { onDelete: "cascade" }),
    maturityLevel: text("maturity_level").notNull().default("functional_prototype"), // idea, in_development, partially_implemented, functional_prototype, completed, deployed
    actualContribution: text("actual_contribution"),
    implementationGaps: text("implementation_gaps"),
    unfinishedFeatures: text("unfinished_features"),
    limitations: text("limitations"),
    isProductionReady: boolean("is_production_ready").notNull().default(false),
    architectureNotes: text("architecture_notes"),
    repositoryUrl: text("repository_url"),
    liveUrl: text("live_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("project_metadata_user_entry_idx").on(table.userId, table.entryId),
  ]
);

// ==========================================
// 19. Application Interviews History (Section 18.8)
// ==========================================
export const applicationInterviews = pgTable(
  "application_interviews",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    applicationId: text("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    roundName: text("round_name").notNull(), // Recruiter Screen, Technical Screen, Coding, System Design, Behavioral, Executive Onsite
    roundNumber: integer("round_number").notNull().default(1),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    interviewers: text("interviewers"),
    status: text("status").notNull().default("scheduled"), // scheduled, passed, failed, cancelled, rescheduled
    feedbackNotes: text("feedback_notes"),
    prepNotes: text("prep_notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("app_interviews_user_app_idx").on(table.userId, table.applicationId),
  ]
);

// ==========================================
// 20. Quantification Interviews (Section 18.4)
// ==========================================
export const quantificationInterviews = pgTable(
  "quantification_interviews",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    entryId: text("entry_id").references(() => bankEntries.id, { onDelete: "cascade" }),
    bulletId: text("bullet_id").references(() => achievementBullets.id, { onDelete: "cascade" }),
    questionKey: text("question_key").notNull(), // scale_users, team_size, throughput, latency, outcome
    promptQuestion: text("prompt_question").notNull(),
    userResponse: text("user_response"),
    metricEstimate: doublePrecision("metric_estimate"),
    metricUnit: text("metric_unit"),
    isVerified: boolean("is_verified").notNull().default(false),
    status: text("status").notNull().default("pending"), // pending, answered, dismissed
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("quant_interviews_user_bullet_idx").on(table.userId, table.bulletId),
    index("quant_interviews_user_entry_idx").on(table.userId, table.entryId),
  ]
);

// ==========================================
// 21. User Usage & Free-Tier Quotas (Section 18.9)
// ==========================================
export const userUsageQuotas = pgTable(
  "user_usage_quotas",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    monthlyPeriod: text("monthly_period").notNull(), // YYYY-MM
    aiTokensConsumed: integer("ai_tokens_consumed").notNull().default(0),
    aiGenerationsCount: integer("ai_generations_count").notNull().default(0),
    exportsGeneratedCount: integer("exports_generated_count").notNull().default(0),
    activeResumesCount: integer("active_resumes_count").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("user_usage_quotas_user_period_idx").on(table.userId, table.monthlyPeriod),
  ]
);

