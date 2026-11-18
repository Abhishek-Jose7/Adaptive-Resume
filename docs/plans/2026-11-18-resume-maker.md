# Resume Maker Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the complete, production-ready Resume Maker web application strictly adhering to PRD.md v1.1 with Next.js, Neon PostgreSQL, Drizzle ORM, Clerk, truth-bound AI tailoring, browser-based document compute, and $0 free-tier constraints.

**Architecture:** Browser-heavy, serverless architecture. heavy compute (PDF/DOCX extraction and DOCX generation, preview rendering, client ATS recalculation) executes in the browser; server-side Next.js App Router API handles authentication, tenant-scoped PostgreSQL data access via Drizzle ORM, AI provider proxying with quota guards, and SSRF-protected URL fetching.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS, Lucide Icons, Drizzle ORM, PostgreSQL (local PostgreSQL 17 + Neon serverless pooled driver), Clerk Auth (`@clerk/nextjs`), Zod v3, `docx`, `pdfjs-dist`, `mammoth`, `jszip`, `diff`, Vitest, Playwright.

---

## 1. Traceability Matrix

| Requirement ID | Description | Milestone | Task |
|---|---|---|---|
| **A1-A5** | Clerk auth, tenant scoping, data export, account deletion, signup allowlist, username claim | M1, M6 | Tasks 1.3, 1.4, 6.1, 6.4 |
| **B1-B8** | Data Bank entries CRUD, atomic bullets, structured facts, completeness checks, soft delete, history, embeddings fallback | M1 | Tasks 1.5 - 1.9 |
| **I1-I7** | Intake staging, PDF/DOCX browser parse, paste text, LinkedIn ZIP, GitHub repos, 10MB/10-page limits | M2 | Tasks 2.1 - 2.5 |
| **J1-J6** | JD ingestion: paste, SSRF-safe URL fetch, PDF/image parse, deduplication & normalization | M2 | Tasks 2.6 - 2.8 |
| **N1-N4** | JD structured analysis (schema Appendix A), keyword editing, promote/demote, caching | M2 | Tasks 2.9 - 2.10 |
| **T1-T11** | Tailoring engine: relevance scoring (10.2), truth-bound rewrite validator (10.4), skill flags, summary, badges, diff view, pins, telemetry | M3 | Tasks 3.1 - 3.7 |
| **S1-S4** | Resume-JD Match Score (0-100 breakdown 10.5), gap report, client live recalculation, plain text preview | M3 | Tasks 3.8 - 3.9 |
| **E1-E10** | Form panel + click-to-edit preview, undo/redo, autosave (row_version) + IndexedDB, rich text, shortcuts | M4 | Tasks 4.1 - 4.4 |
| **M1-M5** | ATS-safe fixed templates (4 templates), themeable gallery, ATS lint, print CSS, A4/Letter | M4 | Tasks 4.5 - 4.7 |
| **F1-F4** | One-page auto-fit ladder (spacing -> font size -> margins -> drop bullets -> compact template) | M4 | Task 4.8 |
| **C1-C3** | Cover letter generator from JD & bullets, truth-validated, editable, exportable | M5 | Tasks 5.4 - 5.5 |
| **V1-V5** | Per-job resume forking, immutable version snapshots, application tracker (List & Kanban), version locking | M5 | Tasks 5.1 - 5.3 |
| **X1-X7** | Browser print-to-PDF, client-side DOCX, plain-text serializer, public profile (/u/[username]), expiring links (/s/[token]) | M4, M6 | Tasks 4.9 - 4.11, 6.2 - 6.3 |
| **P1-P5** | Provider abstraction (LlmProvider), BYOK AES-256-GCM encrypted, model mapping, retry/fallback, usage dashboard | M3, M6 | Tasks 3.2, 6.4 |
| **Y1-Y3** | Privacy notices, account deletion cascade, export all data, raw file discarding | M6 | Tasks 6.1, 6.5 |
| **DB & Query Quality** | Drizzle schema with exact constraints, composite indexes, tsvector GIN full text search, EXPLAIN ANALYZE benchmark, 10k seed script | M1, M6 | Tasks 1.1, 1.2, 6.6 |

---

## Milestone M0: Feasibility Spikes & Project Foundation

### Task 0.1: Initialize Next.js 15 Project with Tailwind, TypeScript & Essential Tooling
**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- Test: Build verification (`npm run build`)

**Step 1: Initialize project scaffolding**
Run: `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-turbopack` (or setup manually with consistent clean dependencies)
Verify `package.json` contains:
- `next`, `react`, `react-dom`
- `drizzle-orm`, `drizzle-kit`, `postgres`, `@neondatabase/serverless`
- `@clerk/nextjs`
- `zod`, `lucide-react`, `clsx`, `tailwind-merge`
- `docx`, `pdfjs-dist`, `mammoth`, `jszip`, `diff`
- Dev deps: `vitest`, `@testing-library/react`, `@types/node`, `@types/react`

**Step 2: Install dependencies**
Run: `npm install`
Expected: Dependencies installed with 0 vulnerabilities.

**Step 3: Verify initial build and test framework**
Run: `npm run build` and `npm run test` (via Vitest configuration).
Expected: PASS.

---

## Milestone M1: Core Database Schema, Drizzle Setup & Data Bank

### Task 1.1: Complete Drizzle Database Schema (Section 8.2, 8.3 & Appendix B)
**Files:**
- Create: `src/lib/db/schema.ts`
- Create: `src/lib/db/client.ts`
- Create: `drizzle.config.ts`

**Schema Entities to Implement:**
1. `users`: `id`, `clerkSubject`, `username`, `displayName`, `email`, `createdAt`, `updatedAt`, `deletedAt`
2. `bankEntries`: `id`, `userId`, `entryType`, `title`, `organization`, `location`, `startDate`, `endDate`, `isCurrent`, `descriptionContext`, `visibility`, `verificationStatus`, `sortOrder`, `rowVersion`, `createdAt`, `updatedAt`, `deletedAt`
3. `achievementBullets`: `id`, `userId`, `entryId`, `text`, `normalizedText`, `visibility`, `verificationStatus`, `usagePolicy`, `sortOrder`, `rowVersion`, `sourceId`, `createdAt`, `updatedAt`, `deletedAt`
4. `bulletFacts`: `id`, `userId`, `bulletId`, `entryId`, `factType`, `factKey`, `valueText`, `valueNumber`, `unit`, `currencyCode`, `metricKind`, `sourceEvidenceId`, `verificationStatus`, `createdAt`
5. `bulletRelations`: `id`, `userId`, `sourceBulletId`, `targetBulletId`, `relationType`, `createdAt`
6. `sources`: `id`, `userId`, `sourceType`, `sourceLabel`, `sourceUrl`, `sourceHash`, `parserVersion`, `retentionPolicy`, `importedAt`, `createdAt`
7. `sourceEvidence`: `id`, `userId`, `sourceId`, `sourceLocator`, `snippet`, `contentHash`, `confidence`, `createdAt`
8. `importBatches`: `id`, `userId`, `sourceId`, `batchStatus`, `totalItems`, `stagedItemsCount`, `createdAt`
9. `stagedItems`: `id`, `userId`, `batchId`, `entryType`, `rawSnippet`, `parsedDataJson`, `confidence`, `status`, `resolvedEntryId`, `createdAt`
10. `jobs`: `id`, `userId`, `title`, `company`, `location`, `sourceUrl`, `rawText`, `contentHash`, `createdAt`, `updatedAt`
11. `jdAnalyses`: `id`, `userId`, `jobId`, `analysisJson`, `confidence`, `promptVersion`, `createdAt`, `updatedAt`
12. `resumeDocuments`: `id`, `userId`, `title`, `baseResumeId`, `jobId`, `createdAt`, `updatedAt`
13. `resumeVersions`: `id`, `userId`, `resumeDocumentId`, `parentVersionId`, `versionNumber`, `versionKind`, `resumeDocJson`, `contentHash`, `templateId`, `templateVersion`, `pageSize`, `targetPages`, `createdAt`, `finalizedAt`, `immutableAt`
14. `applications`: `id`, `userId`, `jobId`, `resumeVersionId`, `status`, `appliedAt`, `followUpAt`, `notes`, `createdAt`, `updatedAt`
15. `coverLetters`: `id`, `userId`, `jobId`, `applicationId`, `title`, `content`, `tone`, `createdAt`, `updatedAt`
16. `aiRuns`: `id`, `userId`, `taskType`, `jobId`, `resumeVersionId`, `provider`, `model`, `promptVersion`, `tokensIn`, `tokensOut`, `validatorReportJson`, `createdAt`
17. `providerCredentials`: `id`, `userId`, `provider`, `encryptedApiKey`, `keyNonce`, `keyVersion`, `last4`, `isValid`, `lastTestedAt`, `createdAt`, `updatedAt`
18. `shareLinks`: `id`, `userId`, `resumeVersionId`, `tokenHash`, `scopeJson`, `redactionsJson`, `expiresAt`, `revokedAt`, `createdAt`
19. `auditEvents`: `id`, `userId`, `action`, `resourceType`, `resourceId`, `metadataJson`, `ipAddress`, `createdAt`
20. `backgroundJobs`: `id`, `userId`, `taskType`, `inputRef`, `progressStage`, `attemptCount`, `idempotencyKey`, `leaseExpiresAt`, `lastErrorCode`, `createdAt`, `updatedAt`, `completedAt`

**PostgreSQL Indexes & Constraints:**
- Composite index: `(user_id, entry_type, updated_at DESC, id DESC) WHERE deleted_at IS NULL`
- Composite index: `(user_id, updated_at DESC, id DESC) WHERE deleted_at IS NULL`
- Bullet index: `(user_id, entry_id, sort_order, id) WHERE deleted_at IS NULL`
- Bullet facts indexes: `(user_id, bullet_id)` and `(user_id, entry_id)`
- Jobs index: `(user_id, created_at DESC, id DESC)`, `(user_id, content_hash)`
- Resume versions index: `(user_id, resume_document_id, version_number DESC)`
- Share links index: `(user_id, expires_at) WHERE revoked_at IS NULL`, unique index on `token_hash`
- Unique constraint: `(user_id, resume_document_id, version_number)`
- Search vectors and GIN indexes for full text search on `bank_entries` and `achievement_bullets`.

### Task 1.2: Database Migrations & Dual Driver Client (Neon Serverless & Local Postgres)
**Files:**
- Create: `drizzle/0000_initial.sql`
- Create: `src/lib/db/migrate.ts`
- Test: Run migration against local PostgreSQL 17 test database.

### Task 1.3: Authentication & Tenant Security (Clerk Integration & Scoped Repositories)
**Files:**
- Create: `src/lib/auth/clerk.ts` (Clerk middleware & server-side session validator with Dev Mode bypass for automated tests)
- Create: `src/lib/auth/allowlist.ts` (Signup allowlist rule enforcing `SIGNUP_ALLOWLIST` in app logic)
- Create: `src/lib/db/tenant.ts` (Scoped DB access helper requiring verified `userId`)
- Create: `src/app/api/v1/me/route.ts`
- Create: `src/app/api/v1/settings/route.ts`

### Task 1.4: Canonical Data Model & Shared Zod Schemas (`ResumeDoc`, Facts, Entries)
**Files:**
- Create: `src/types/resume.ts`
- Create: `src/types/bank.ts`
- Create: `src/types/job.ts`
- Create: `src/lib/validation/resumeDoc.ts`
- Create: `src/lib/validation/bank.ts`

### Task 1.5: Data Bank Repository & Service Layer
**Files:**
- Create: `src/lib/repositories/bankRepository.ts`
- Create: `src/lib/services/bankService.ts`
- Create: `src/lib/services/completenessService.ts` (checks missing metrics, missing dates, unevidenced skills)
- Create: `src/lib/services/duplicateDetectionService.ts` (org + title overlap, bullet text hashes)

### Task 1.6: Data Bank API Endpoints (`/api/v1/bank/...`)
**Files:**
- Create: `src/app/api/v1/bank/entries/route.ts` (List with cursor pagination & search, Create)
- Create: `src/app/api/v1/bank/entries/[id]/route.ts` (Get, Update with row_version, Soft-delete)
- Create: `src/app/api/v1/bank/entries/bulk/route.ts` (Bulk reorder, bulk delete)
- Create: `src/app/api/v1/bank/entries/[id]/bullets/route.ts` (List, Create atomic bullet with facts)
- Create: `src/app/api/v1/bank/bullets/[id]/route.ts` (Update, Soft-delete)

### Task 1.7: Data Bank Frontend UI Components & Pages
**Files:**
- Create: `src/app/(dashboard)/bank/page.tsx`
- Create: `src/components/bank/BankEntryCard.tsx`
- Create: `src/components/bank/BankEntryModal.tsx`
- Create: `src/components/bank/BulletEditor.tsx`
- Create: `src/components/bank/FactBadge.tsx`
- Create: `src/components/bank/CompletenessWarning.tsx`
- Create: `src/components/bank/DuplicateDetectorModal.tsx`

---

## Milestone M2: Data Intake & Job Description Ingestion

### Task 2.1: Browser-Based Document Parsers (PDF, DOCX, LinkedIn ZIP)
**Files:**
- Create: `src/lib/parsers/browserPdfParser.ts` (pdfjs-dist text extraction with 10MB/10-page bounds)
- Create: `src/lib/parsers/browserDocxParser.ts` (mammoth text & structure extraction)
- Create: `src/lib/parsers/browserZipParser.ts` (jszip unzipping Positions.csv, Education.csv, Skills.csv)
- Create: `src/lib/parsers/fileValidator.ts` (mime check, magic bytes, size bounds)

### Task 2.2: Staging Area System & API (`/api/v1/imports/...`)
**Files:**
- Create: `src/lib/repositories/importRepository.ts`
- Create: `src/lib/services/stagingService.ts`
- Create: `src/app/api/v1/imports/route.ts`
- Create: `src/app/api/v1/imports/[id]/parse/route.ts`
- Create: `src/app/api/v1/imports/[id]/route.ts`
- Create: `src/app/api/v1/imports/[id]/commit/route.ts`
- Create: `src/app/api/v1/imports/[id]/reject/route.ts`

### Task 2.3: GitHub Integration Import Service
**Files:**
- Create: `src/lib/services/githubImportService.ts` (fetches user repos via token, extracts README excerpts & languages, stages project entries)

### Task 2.4: Intake UI (Staging Review Modal & Intake Workflows)
**Files:**
- Create: `src/app/(dashboard)/bank/intake/page.tsx`
- Create: `src/components/intake/FileUploadDropzone.tsx`
- Create: `src/components/intake/PasteTextInput.tsx`
- Create: `src/components/intake/GitHubImportModal.tsx`
- Create: `src/components/intake/StagingReviewTable.tsx`

### Task 2.5: Job Description Ingestion & SSRF-Safe Fetcher
**Files:**
- Create: `src/lib/security/ssrfProtection.ts` (HTTPS only, DNS resolve check, private IP block, 1MB limit, 8s timeout)
- Create: `src/lib/services/jobScraperService.ts` (extracts JobPosting JSON-LD or main text)
- Create: `src/app/api/v1/jobs/route.ts` (Create with contentHash dedupe, List)
- Create: `src/app/api/v1/jobs/[id]/route.ts` (Get, Update, Delete)

### Task 2.6: JD Structured Analysis Engine & Keyword Manager
**Files:**
- Create: `src/lib/services/jdAnalysisService.ts` (Appendix A Zod schema validation)
- Create: `src/app/api/v1/jobs/[id]/analyze/route.ts`
- Create: `src/app/(dashboard)/jobs/page.tsx`
- Create: `src/app/(dashboard)/jobs/[id]/page.tsx`
- Create: `src/components/jobs/KeywordManager.tsx` (promote, demote, add, remove keywords)

---

## Milestone M3: Tailoring Engine, Truth-Bound Validator & Match Score

### Task 3.1: Provider-Neutral AI Layer (`LlmProvider` & Adapters)
**Files:**
- Create: `src/lib/ai/providerInterface.ts`
- Create: `src/lib/ai/adapters/localDeterministicAdapter.ts` (Offline / Golden test deterministic mock)
- Create: `src/lib/ai/adapters/geminiAdapter.ts` (Google Gemini API with structured outputs)
- Create: `src/lib/ai/adapters/groqAdapter.ts` (Groq API adapter)
- Create: `src/lib/ai/adapters/openaiAdapter.ts` (OpenAI-compatible adapter)
- Create: `src/lib/ai/providerRouter.ts` (Routes by user BYOK or platform default, rate-limiting & exponential backoff)

### Task 3.2: Relevance Scoring & Candidate Retrieval (Section 10.2 & 10.3)
**Files:**
- Create: `src/lib/tailoring/relevanceScorer.ts` (Weights: Must-have 30, Responsibility 20, Outcome 15, Domain 10, Recency 10, Seniority 10, User importance 5)
- Create: `src/lib/tailoring/bulletRetriever.ts` (Deterministic lexical + tag matching with embeddings pre-filter)

### Task 3.3: Truth-Bound Rewrite Validator (Section 10.4)
**Files:**
- Create: `src/lib/tailoring/truthBoundValidator.ts` (Deterministic code checking: schema, exact numbers/metrics, entities/tools, scope/outcome words, claim mapping against evidence)
- Create: `tests/tailoring/truthBoundValidator.test.ts` (Golden set tests with 100+ cases verifying zero unsupported facts)

### Task 3.4: Tailoring Engine Service & API (`/api/v1/jobs/[id]/tailor`)
**Files:**
- Create: `src/lib/services/tailoringService.ts` (Full resume, section, bullet rewrite, skills suggestions, repair retry, telemetry)
- Create: `src/app/api/v1/jobs/[id]/tailor/route.ts`
- Create: `src/app/api/v1/ai-runs/[id]/route.ts`
- Create: `src/app/api/v1/ai-runs/[id]/accept/route.ts`
- Create: `src/app/api/v1/ai-runs/[id]/reject/route.ts`

### Task 3.5: Resume-JD Match Score & Gap Report Engine (Section 10.5 & FR-S)
**Files:**
- Create: `src/lib/scoring/matchScoreEngine.ts` (0-100 score with exact breakdown)
- Create: `src/lib/scoring/gapReportEngine.ts` (Categorizes missing keywords: "in bank but unused" vs "not in bank")
- Create: `src/components/scoring/MatchScoreWidget.tsx`
- Create: `src/components/scoring/GapReportModal.tsx`

---

## Milestone M4: Resume Editor, Templates & Document Export

### Task 4.1: Canonical `ResumeDoc` State & Editor Store
**Files:**
- Create: `src/lib/editor/resumeDocStore.ts` (Zustand or React state with patch-based undo/redo, dirty tracking)
- Create: `src/lib/editor/indexedDbDraft.ts` (Local draft persistence for offline/crash recovery)

### Task 4.2: Split-Pane Resume Editor (Form Panel + Click-to-Edit Live Preview)
**Files:**
- Create: `src/app/(dashboard)/resumes/[id]/edit/page.tsx`
- Create: `src/components/editor/EditorFormPanel.tsx` (Drag-reorder sections, entries, bullets, provenance badges, pin toggles)
- Create: `src/components/editor/EditorPreviewPanel.tsx` (Click-to-edit elements with two-way sync)
- Create: `src/components/editor/AutosaveIndicator.tsx` (Saving, Saved, Offline, Conflict states)
- Create: `src/components/editor/InlineRephrasePopover.tsx`

### Task 4.3: ATS-Safe Templates & Themeable Gallery (Section 6.9 & Appendix B)
**Files:**
- Create: `src/components/templates/ClassicAtsTemplate.tsx` (Single column, standard headings, no tables/icons)
- Create: `src/components/templates/ModernAtsTemplate.tsx`
- Create: `src/components/templates/MinimalExecutiveTemplate.tsx`
- Create: `src/components/templates/TechnicalScholarTemplate.tsx`
- Create: `src/components/templates/TemplateRenderer.tsx`
- Create: `src/lib/templates/themeTokens.ts` (Fonts, sizes, margins, colors, density)
- Create: `src/lib/templates/atsLint.ts` (Warns on small fonts <9pt, low contrast, non-standard headings)

### Task 4.4: One-Page Auto-Fit Ladder (Section 10.6)
**Files:**
- Create: `src/lib/editor/autoFitLadder.ts` (Progressive tightening: section spacing -> font size -> margins -> bullet shedding with restore list -> compact template)
- Create: `src/components/editor/AutoFitModal.tsx`

### Task 4.5: Document Export Services (PDF, DOCX, TXT)
**Files:**
- Create: `src/app/resumes/[id]/print/page.tsx` (Dedicated print route with `@page` CSS and page-break rules)
- Create: `src/lib/export/docxGenerator.ts` (Client-side DOCX creation using `docx` with semantic styles, no tables)
- Create: `src/lib/export/plainTextSerializer.ts` (Deterministic ATS paste-box plain text)
- Create: `src/components/editor/ExportMenu.tsx`

---

## Milestone M5: Versions, Application Tracker & Cover Letters

### Task 5.1: Resume Versions & Immutable Snapshots
**Files:**
- Create: `src/lib/services/versionService.ts` (Creates immutable finalized snapshots with SHA-256 hash, child versions for edits)
- Create: `src/app/api/v1/resumes/[id]/versions/route.ts`
- Create: `src/app/api/v1/resume-versions/[id]/finalize/route.ts`
- Create: `src/app/api/v1/resume-versions/[id]/restore/route.ts`
- Create: `src/components/versions/VersionHistoryDrawer.tsx`
- Create: `src/components/versions/VersionDiffViewer.tsx`

### Task 5.2: Application Tracker (List & Kanban Views)
**Files:**
- Create: `src/lib/services/applicationService.ts`
- Create: `src/app/api/v1/applications/route.ts`
- Create: `src/app/api/v1/applications/[id]/route.ts`
- Create: `src/app/(dashboard)/applications/page.tsx`
- Create: `src/components/applications/ApplicationKanbanBoard.tsx`
- Create: `src/components/applications/ApplicationListTable.tsx`
- Create: `src/components/applications/ApplicationModal.tsx`

### Task 5.3: Cover Letter Generator & Editor
**Files:**
- Create: `src/lib/services/coverLetterService.ts` (Generated from JD + top bullets, validated for truth)
- Create: `src/app/api/v1/cover-letters/route.ts`
- Create: `src/app/(dashboard)/cover-letters/[id]/page.tsx`
- Create: `src/components/cover-letter/CoverLetterEditor.tsx`

---

## Milestone M6: Sharing, BYOK Settings, Privacy, Performance & Testing

### Task 6.1: Public Profiles & Expiring Share Links
**Files:**
- Create: `src/lib/security/shareToken.ts` (128-bit crypto random token, SHA-256 stored hash)
- Create: `src/lib/services/shareService.ts` (Redaction of phone/email/address, expiry validation, revocation)
- Create: `src/app/api/v1/shares/route.ts`
- Create: `src/app/api/v1/shares/[id]/route.ts`
- Create: `src/app/u/[username]/page.tsx` (Public profile route, `noindex` meta tag)
- Create: `src/app/s/[token]/page.tsx` (Expiring share link route, server-side validated & redacted)
- Create: `src/components/share/ShareSettingsModal.tsx`

### Task 6.2: BYOK Credential Vault (AES-256-GCM Encryption)
**Files:**
- Create: `src/lib/security/encryption.ts` (AES-256-GCM encryption/decryption with unique IV/nonce and versioning)
- Create: `src/app/api/v1/provider-credentials/route.ts` (Save encrypted key, list masked keys)
- Create: `src/app/api/v1/provider-credentials/[id]/test/route.ts` (Test provider connectivity)
- Create: `src/app/(dashboard)/settings/providers/page.tsx`

### Task 6.3: Account Export & Cascade Deletion (Privacy FR-Y)
**Files:**
- Create: `src/app/api/v1/export/account.json/route.ts` (Full JSON export of all user records)
- Create: `src/app/api/v1/account/route.ts` (Cascading hard delete of all owned records and credentials)
- Create: `src/app/(dashboard)/settings/privacy/page.tsx`

### Task 6.4: Database Performance Verification & Seed Benchmarks
**Files:**
- Create: `src/lib/db/seed.ts` (Realistic multi-user seed script generating 10,000+ entries & bullets)
- Create: `tests/performance/explainAnalyze.test.ts` (Runs PostgreSQL EXPLAIN ANALYZE on queries, verifies index scans, checks no table scans on high-cardinality tables)

### Task 6.5: End-to-End User Journey Tests
**Files:**
- Create: `tests/e2e/coreUserFlow.test.ts` (Simulates full lifecycle: Auth -> Data Bank CRUD -> Intake -> JD parse -> Tailor -> Validate -> Edit -> Autosave -> Finalize -> Export -> Share -> Export JSON -> Account Delete)
- Create: `tests/tailoring/goldenSet.test.ts` (100 labelled test cases for AI truthfulness)

---
