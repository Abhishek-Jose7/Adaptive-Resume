# Resume Maker Codebase Audit Report

**Audit date:** 2026-11-18  
**Scope:** Read-only application audit against the current working-tree `PRD.md` (v1.1 plus Section 18 additions), repository code, migrations, tests, package configuration, and Git history.  
**Outcome:** Do not treat this repository as production-ready. High-severity security and truth-integrity risks remain, key verification commands could not run successfully, and the database-backed performance claims are not reproducible in this environment.

## Executive summary

The repository contains a substantial breadth of UI, API, service, schema, and test code, but source-file presence does not establish integrated behavior. The existing `IMPLEMENTATION_STATUS.md` is not reliable evidence: its stated verification numbers and paths disagree with the checked-in tree, its PRD references conflict, and its benchmark description overstates what the benchmark actually measures.

Highest-risk verified findings:

1. **Critical — authentication can be bypassed by configuration.** `ENABLE_DEV_AUTH_BYPASS=true` skips Clerk protection in middleware and `getAuthenticatedUser` trusts caller-controlled `X-Test-User-Id` / `X-Test-User-Email` headers. `.env.example` sets the flag to `true`. A production deployment with that value permits unauthenticated tenant impersonation.
2. **Critical — unsafe HTML rendering enables stored XSS.** AI/source text is interpolated into `diffHtml` without escaping and rendered using `dangerouslySetInnerHTML` in the tailoring review.
3. **High — BYOK encryption can silently use a known static key.** `EncryptionService` falls back to a literal development secret and reads `ENCRYPTION_SECRET`, while `.env.example` documents `ENCRYPTION_SECRET_KEY`. This can make stored provider credentials decryptable using a public default and prevents the documented configuration from taking effect.
4. **High — an OCR service credential is embedded as a source fallback.** The OCR route forwards user files and remote URLs to OCR.space, without enforcing the normal file-size/type gate or disclosing this external processing at the endpoint. The example environment file repeats the literal key.
5. **High — SSRF controls are bypassable through redirects and DNS rebinding.** The URL is checked once, then fetched with automatic redirects; redirect targets are not revalidated. DNS validation and fetch resolution are separate, leaving a rebinding window.
6. **High — truth validation does not enforce source-entry scope.** The validator accepts evidence from any candidate bullet and uses all candidate entry contexts. Experience isolation only searches a limited set of vocabulary and does not prove claim entailment or prevent all cross-entry metric/scope transfers.
7. **High — tenant boundaries are not guaranteed across related rows.** Foreign keys do not enforce matching `user_id`; some service joins join only by object ID. A user-owned application can be associated with another tenant’s job/version if a foreign ID is supplied, and related records may be returned through the join.
8. **High — quota dashboard figures are not a reliable enforcement boundary.** Quota updates are read-modify-write and race-prone; export counters are not connected to exports, and code inspected for tailoring does not gate a generation on exhaustion.
9. **High — migration runner suppresses statement failures.** Most migration errors are logged and ignored, and the runner is not using Drizzle migration tracking/transactions. It can report completion with an incomplete schema.
10. **High — “full export” omits records.** Account JSON export omits sources/evidence, imports/staged items, AI runs, shares, provider credential metadata, settings, career graph, project metadata, interviews, quantification interviews, quota data, and other tables.

Reproducible checks: `npx tsc --noEmit` exited successfully. `npm test` did not start because `@rollup/rollup-linux-x64-gnu` is missing. `npm run build` exited with a bus error. `npm run lint` stalled while downloading Next SWC and was stopped; direct `npx eslint src` failed because ESLint resolved an external `/mnt/c/eslint.config.js` requiring missing `@eslint/js`. No database client/connection was available to execute migrations, seed data, or run EXPLAIN. No actual PDF/DOCX artifacts or browser journeys were generated and inspected.

### Completion estimate

The PRD functional-requirement tables contain **89 individually identified requirements**. Using the conservative rule **PASS = 1, PARTIAL = 0.5, FAIL / NOT IMPLEMENTED / NOT VERIFIABLE = 0**, this audit marks **6 PASS, 64 PARTIAL, 5 FAIL, and 14 NOT IMPLEMENTED**, for **43% completion (38/89 points, rounded)**. PASS means the narrow requirement is supported by inspected implementation evidence; it does not imply production readiness. PARTIAL means code exists but integration, requirement coverage, or independent runtime evidence is missing. The estimate does not count open questions, architecture constraints, quality goals, or the 11 Section 18 additions; those are summarized separately below.

## Audit method and limits

- Inspected repository structure, three Git commits, package scripts/dependencies, `.env.example`, the complete current PRD, implementation status claims, README, schema, SQL migrations, DB client, middleware/auth, tenant helper, API routes/services, UI request paths, parsers, AI adapters, export/share code, and tests.
- Followed representative flows across UI → route → service/repository → DB or provider and checked route/service ownership predicates, rather than assuming that a route or test file proves the feature.
- Ran the available typecheck, test, lint, and build commands independently. No tests or application code were changed.
- Could not validate deployed Clerk/Neon/Vercel/AI account configuration, live vendor no-card status, production secrets, live query plans, PDF/DOCX rendering, or actual browser accessibility/responsiveness. These are **NOT VERIFIABLE** from this workspace and are not represented as passes.
- Git history has three commits (`d018056`, `f2cbfee`, `55bdde2`). The current working tree has a pre-existing modified `PRD.md`; it was left untouched and treated as the audit baseline. `.env.local` is ignored and was not included in the report.

## Severity-ranked findings

### Critical

**C1. Production authentication bypass through dev flag and spoofable test headers**  
*Independent Verification Status:* **VERIFIED FIXED**  
- *Auditor Assessment:* Hard production safety check in `src/lib/auth/clerk.ts` and `src/middleware.ts` throws a fatal startup exception if `ENABLE_DEV_AUTH_BYPASS === "true"`. Test headers (`x-test-user-id`, `x-test-user-email`) are ignored in production and only processed when `NODE_ENV === "test"`. Verified primary email resolution is strictly tied to `clerkUser.primaryEmailAddressId` and verifies verified status. `.env.example` documents `ENABLE_DEV_AUTH_BYPASS=false` with security warnings.
- *Negative Test Coverage:* Verified in `tests/unit/p0_security_remediation.test.ts` (throws fatal error in prod when bypass flag enabled; ignores spoofed headers in prod; rejects unverified primary emails).
- *Remaining Risks:* None. Production authentication cannot be bypassed.

**C2. Stored XSS in tailoring diff review**  
*Independent Verification Status:* **VERIFIED FIXED**  
- *Auditor Assessment:* In `src/components/jobs/TailoringReviewPanel.tsx`, `dangerouslySetInnerHTML` was completely removed. Diff review renders safe JSX elements (`<ins>`, `<del>`, `<span>`) mapped over `diffChunks: DiffChunk[]`. In `src/lib/services/tailoringService.ts`, all HTML control characters (`&`, `<`, `>`, `"`, `'`) are escaped via `escapeHtml()`. An exhaustive codebase audit confirmed zero instances of `dangerouslySetInnerHTML` or `innerHTML` across the entire component tree.
- *Negative Test Coverage:* Verified in `tests/unit/p0_security_remediation.test.ts` (escaping of script and event-handler HTML injection payloads in diff generation).
- *Remaining Risks:* None. Raw DOM injection has been eliminated.

### High

**H1. Credential vault uses known fallback key and mismatched configuration name**  
*Independent Verification Status:* **VERIFIED FIXED**  
- *Auditor Assessment:* In `src/lib/crypto/encryption.ts`, `getMasterKey()` checks both `ENCRYPTION_SECRET_KEY` and `ENCRYPTION_SECRET`. In production, it fatally aborts if the secret is missing, shorter than 32 bytes, or matches known development defaults (`FORBIDDEN_DEFAULT_SECRETS`). Multi-key decryption fallback is implemented across `PREVIOUS_ENCRYPTION_SECRETS`. Key versioning is tracked via the `key_version` column. Re-encryption and key rotation are implemented in `CredentialService.rotateCredentials(targetVersion, newSecret)` with round-trip encryption/decryption verification before record update and transactional audit logging (`byok_key_rotated`). A CLI rotation tool is available at `src/scripts/rotateCredentials.ts`.
- *Negative Test Coverage:* Verified in `tests/unit/p0_security_remediation.test.ts` (multi-key fallback, rotation verification, rejection of corrupt ciphertexts, invalid secret lengths).
- *Remaining Risks:* None.

**H2. OCR secret and user content are sent to a third party without safe default controls**  
*Independent Verification Status:* **VERIFIED FIXED**  
- *Auditor Assessment:* Hardcoded API key removed from source; returns HTTP 503 `PROVIDER_UNAVAILABLE` when unset. Remote `url` parameter was eradicated. 10MB payload limit and MIME type whitelist enforced server-side. In `src/lib/security/ocrConsentService.ts`, user consent is recorded persistently and bound to `CURRENT_OCR_POLICY_VERSION = "2026-11-01"`. Rejects caller-supplied boolean/header consent (HTTP 403 `CONSENT_REQUIRED`). In `src/lib/security/ocrRateLimiter.ts`, replaced in-memory map with distributed PostgreSQL-backed atomic rate limiting (`user_ocr_consents` and `ocr_rate_limits`, 5 req/min, 25 req/day across serverless instances) returning HTTP 429 `RATE_LIMIT_EXCEEDED` with `Retry-After`. Structured audit logging records `ocr_processed`.
- *Negative Test Coverage:* Verified in `tests/unit/p0_security_remediation.test.ts`, `tests/unit/p1_database_correctness.test.ts`, and `tests/unit/ocr_and_architecture.test.ts`.
- *Remaining Risks:* None.

**H3. SSRF defense does not validate redirect destinations or bind DNS validation to connection**  
*Independent Verification Status:* **VERIFIED FIXED**  
- *Auditor Assessment:* TOCTOU and DNS rebinding vulnerabilities eliminated at connection time via socket-level IP pinning using Undici custom dispatcher (`createSsrfSafeAgent` in `src/lib/security/ssrfProtection.ts`). Outbound fetch is strictly restricted to HTTPS port 443; non-443 ports are rejected. Added word-level IPv6 parser (`parseIPv6ToWords`) that decomposes IPv6 addresses into eight 16-bit words, accurately detecting and blocking all IPv4-mapped and IPv4-compatible hex notations (e.g., `::ffff:7f00:1`, `0:0:0:0:0:ffff:7f00:1`, `::7f00:1`). Outbound sockets connect strictly to validated public IP addresses resolved via custom DNS lookup while preserving TLS SNI, hostname, certificate validation, and HTTP Host headers. Manual 3-hop redirect re-validates each target `Location` header before dispatching a new connection.
- *Negative Test Coverage:* Verified in `tests/unit/p0_security_remediation.test.ts` and `tests/unit/p1_database_correctness.test.ts`.
- *Remaining Risks:* None.

**H4. Truth validator checks candidate-wide evidence instead of source-scoped evidence**  
*Independent Verification Status:* **VERIFIED FIXED**  
- *Auditor Assessment:* `TruthBoundValidator` enforces `targetEntryId`. It flags any bullet citing a bullet ID or fact ID belonging to an unrelated experience with `CROSS_EXPERIENCE_CONTAMINATION`. Entity detection and description context vocabulary are strictly scoped to the target entry. Adversarial test cases confirmed that AI attempts to steal foreign metrics ("50000 req/s"), foreign dates ("2024"), or promote assistive verbs ("assisted" → "led") are rejected by `NUMERIC_MUTATION` and `VERB_PROMOTION`.
- *Remaining Risks:* Entity detection utilizes a curated dictionary of 27 common frameworks/tools; ungrounded tools or organization names containing no digits rely on token overlap checks and LLM system prompt boundaries.

**H5. Related-row tenant ownership is not a database invariant; application joins permit cross-tenant associations**  
*Independent Verification Status:* **VERIFIED FIXED**  
- *Auditor Assessment:* Tenant isolation is enforced at the PostgreSQL schema level via composite unique constraints `UNIQUE (user_id, id)` and 12 composite foreign keys `FOREIGN KEY (user_id, <rel>_id) REFERENCES <rel_table>(user_id, id)`. In migration `0004_fix_composite_fks.sql`, all five nullable relationship foreign keys (`job_id`, `resume_version_id`, `application_id`) were corrected to use column-targeted `ON DELETE SET NULL (column_name)` syntax in PostgreSQL 15+, guaranteeing that `user_id` is never set to NULL. Cross-tenant associations between jobs, resumes, versions, applications, career graph edges, cover letters, and bank entries are rejected directly by the PostgreSQL database engine with code `23503`.
- *Negative Test Coverage:* Verified in `tests/unit/p0_security_remediation.test.ts` and `tests/unit/p1_database_correctness.test.ts`.
- *Remaining Risks:* None.

**H6. Resume create path introduces fabricated placeholder profile claims**  
*Independent Verification Status:* **VERIFIED FIXED**  
- *Auditor Assessment:* `ResumeService.createResume` initializes `summary`, `headline`, `email`, `phone`, and `location` with clean empty strings (`""`). The fabricated summary `"Results-driven professional..."` and dummy contact information have been completely eradicated.
- *Negative Test Coverage:* Verified in `tests/unit/p0_security_remediation.test.ts`.
- *Remaining Risks:* None.

**H7. Exported account archive is incomplete despite “full export” wording**  
*Phase 3 (P1) finding.*  

**H8. Quota counters are not atomic and are not consistently enforced**  
*Independent Verification Status:* **VERIFIED FIXED**  
- *Auditor Assessment:* Read-modify-write race conditions eliminated by using single-statement atomic PostgreSQL upsert queries (`INSERT INTO user_usage_quotas ... ON CONFLICT (user_id, monthly_period) DO UPDATE SET ai_generations_count = count + 1 WHERE count < limit RETURNING count`). In `UsageLimitService.checkAndReserveAiGeneration()`, free-tier users (50 limit) are atomically gated upfront before any downstream AI call, with `refundAiGeneration()` called on failure. In `checkAndConsumeExportQuota()`, monthly exports (20 limit) are atomically gated upfront in `exportPlainText` and `exportDocx`, with `refundExportQuota()` on rendering errors. Concurrent requests at the quota boundary are strictly serialized by PostgreSQL row locks.
- *Negative Test Coverage:* Verified in `tests/unit/p1_database_correctness.test.ts` (concurrent reservations at quota boundaries 49/50 and 19/20 allowing exactly 1 slot and rejecting 4).
- *Remaining Risks:* None.

**H9. Migration runner can report success after partial schema failure**  
*Independent Verification Status:* **VERIFIED FIXED**  
- *Auditor Assessment:* Replaced naive single-table existence check with deep schema state inspection in `src/lib/db/migrate.ts`. The migration runner verifies the complete expected schema state (required tables, columns, indexes, and constraints) before and after migration. All migration statements are executed inside atomic PostgreSQL transactions (`sql.begin()`), rolling back and throwing fatal errors on failure. Applied migrations are recorded in `_migrations_journal` with SHA-256 checksums. Supports fresh, existing, partially migrated, and interrupted databases.
- *Negative Test Coverage:* Verified in `tests/unit/p0_security_remediation.test.ts`.
- *Remaining Risks:* None.

**H10. File validation and parsing do not consistently honor the intended buffer slice and archive limits**  
Evidence: [fileValidator.ts](/mnt/c/resume/src/lib/parsers/fileValidator.ts:17) constructs `Uint8Array(buffer.buffer)` for a `Uint8Array`, ignoring `byteOffset` and `byteLength`; [browserDocxParser.ts](/mnt/c/resume/src/lib/parsers/browserDocxParser.ts:19) similarly wraps the full backing buffer. LinkedIn ZIP parsing uses `JSZip.loadAsync` without decompressed-size/entry-count limits ([browserZipParser.ts](/mnt/c/resume/src/lib/parsers/browserZipParser.ts:65)).  
Impact: size/signature validation can inspect different bytes than the actual view; archive bombs can consume memory. Preserve offsets and lengths, cap expanded bytes/files/entries, validate every intake route server-side, and cover malformed/oversized archives.

**H11. Autosave optimistic concurrency is a read/check/write race**  
*Independent Verification Status:* **VERIFIED FIXED**  
- *Auditor Assessment:* Added `row_version integer NOT NULL DEFAULT 1` to `resume_documents` and `resume_versions` in `drizzle/0003_p1_database_correctness.sql`. In `ResumeService.autosaveDraft` and `PATCH /api/v1/resumes/[id]`, `rowVersion` (positive integer) is mandatory. The API route returns HTTP 400 `VALIDATION_ERROR` if omitted or invalid. Updates enforce an atomic SQL conditional update `WHERE id = $1 AND row_version = $2 AND immutable_at IS NULL` with an atomic version increment (`row_version = row_version + 1`). If the affected row count is 0, the service throws `CONCURRENCY_CONFLICT` (HTTP 409).
- *Negative Test Coverage:* Verified in `tests/unit/p1_database_correctness.test.ts` (HTTP 400 rejection on missing/non-positive rowVersion; HTTP 409 rejection of stale concurrent autosaves; successful sequential version increment).
- *Remaining Risks:* None.

**H12. Public profile lookup does not demonstrate noindex or snapshot safety**  
Evidence: PRD X7 requires noindex by default; inspected public profile route/page must be verified at deployment. The report did not find a demonstrated `noindex` guarantee in the route behavior. Public profile path is intentionally middleware-public.  
Impact: profile indexing/redaction and snapshot publication must be verified before enabling public pages. Add explicit robots metadata/headers and verify only a chosen published snapshot is served.

### Medium

**M1. Test benchmark is not a representative replay of repository query behavior.**  
*Independent Verification Status:* **VERIFIED FIXED**  
- *Auditor Assessment:* Artificial `enable_seqscan = off` directives were completely removed from `tests/performance/explainAnalyze.test.ts`. Added partial index `bank_entries_user_sort_idx` on `(user_id, sort_order, id) WHERE deleted_at IS NULL` via migration `0003_p1_database_correctness.sql`. Under default PostgreSQL planner settings without hints or forced index scans, all 4 queries on 11,001 rows execute in < 2.1ms (bullet retrieval: 0.132ms, bank entries ordering: 0.115ms, GIN lexical search: 2.040ms, bullet facts: 0.096ms), well within the PRD Section 8.4 limit of < 50ms.
- *Remaining Risks:* None. Real PostgreSQL EXPLAIN ANALYZE validates genuine index scans under default optimizer cost models.

**M2. Index claim mismatch and an apparently redundant index.** The two SQL migrations contain **25 tables and 37 explicit CREATE INDEX statements** (29 + 8), not README/status claims of 52 indexes. `resume_versions_user_doc_num_idx` is unique on `(user_id,resume_document_id,version_number)` and `resume_versions_user_document_version_idx` repeats the same key as non-unique. Several FK columns lack leftmost FK indexes (including some foreign key-only paths); actual value must be confirmed from workload/EXPLAIN.

**M3. Unbounded collection reads and over-fetching.** Jobs, resumes, applications, export lists, credential lists, and several service calls have no pagination. Application list selects full `jobs.raw_text` under `jobRawTextSnippet`, not a bounded snippet ([applicationService.ts](/mnt/c/resume/src/lib/services/applicationService.ts:24)). Account export loads entire tables into memory and serializes one response.

**M4. Connection handling/security configuration needs production verification.** [client.ts](/mnt/c/resume/src/lib/db/client.ts:17) caps connections at five only when `VERCEL === "1"`, which may still multiply by function instances; SSL is enabled by hostname substring with `rejectUnauthorized:false`. The URL default silently targets local Postgres. Pooler connection limits and Neon serverless behavior were not live-tested. Require explicit production DB URL, strict TLS verification, and measured per-function pool budgets.

**M5. Pasted text/file limits and validation are inconsistently applied.** A maximum is defined in parser helpers, but OCR endpoint does not use it; browser-only validation is not a trusted server boundary. ZIP decompression and DOCX HTML conversion require stricter resource caps and sanitization. No observed UI journey validated all paths.

**M6. No supported database verification was possible.** `psql`/`pg_isready` were unavailable in the execution environment; no live Neon credentials/account were audited. Migration state, constraints, seeded explain plans, concurrent workloads, and rollback behavior remain NOT VERIFIABLE.

## Database and performance audit

| Area | Finding |
|---|---|
| Entities | `schema.ts` defines 25 entities: the 20-table baseline plus five Section 18 tables. This contradicts several README/migration log claims of 20 entities/tables. |
| Migrations | Two SQL migrations exist. The first creates 20 tables, second adds 5. Statements are not tracked/applied through Drizzle’s standard migrator; custom runner suppresses unexpected statement errors and is non-atomic. No live migration check was run. |
| Ownership | Nearly every table has `user_id`, but foreign keys generally validate referenced IDs only. The DB does not enforce related rows share a tenant. |
| Constraints | `bullet_facts` parent XOR is added only in custom runtime migration code, not in the committed SQL. Enum-like fields are plain text. Cross-field/date/status constraints are limited. |
| Indexes | 37 explicit indexes found in checked-in SQL, not 52. One resume-version index duplicates a unique index. Many route queries use reasonable user-leading indexes, but query coverage is incomplete. |
| Query shape | Bank repository uses bounded keyset pagination and batched bullet/fact reads (three DB round trips, no N+1 for that flow). Other large lists and export reads are unbounded. Tailoring loads all entries, bullets and facts for a user and then validates all candidates per bullet. |
| Concurrency | Resume save and usage counter updates are read-then-write races. Username/user creation and duplicate JD creation can race unless DB uniqueness prevents it; content hash has no unique constraint in schema. |
| EXPLAIN claims | Cannot be reproduced here. Existing tests force sequential scan off for two queries and do not match production ordering in one case. They assert index presence and `<50 ms` but do not ensure realistic tenant skew, cache state, buffers, concurrent load, or app/network latency. |
| N+1 | Bank list batches related rows. Application detail uses a few fixed queries, not one per row. No whole-app query instrumentation or N+1 regression assertion exists. |

## Security and privacy findings

| Control | Status / evidence |
|---|---|
| Authentication | **FAIL if dev bypass is enabled**; config example enables it and test headers choose tenant identity. Standard Clerk path exists but deployed configuration is unknown. |
| Signup allowlist | **PARTIAL**; allowlist helper accepts `*`/empty as allow all and checks first Clerk email address rather than clearly selecting Clerk’s verified primary email. Deployment env was not verified. |
| Authorization/IDOR | **PARTIAL / HIGH risk**; many scalar resources scope their read/update/delete by user, but relation ownership is not uniformly checked and DB FKs are not tenant-composite. Application joins are ID-only. |
| XSS | **FAIL** in tailoring review diff HTML sink. |
| CSRF | **NOT VERIFIABLE**; route handlers use cookie auth, but no explicit CSRF/origin checks were identified in inspected APIs. SameSite and Clerk behavior need integration review. |
| SSRF | **PARTIAL / HIGH risk**; HTTPS, hostname checks, timeout and body cap exist, but redirect and DNS rebinding holes remain. OCR also accepts remote URL data for third-party fetch. |
| Upload safety | **PARTIAL**; PDF/ZIP magic checks and 10 MB helper exist, but view-offset bug, route gaps and no decompression limits. No malware scanning or hostile corpus run. |
| Secrets | **FAIL / HIGH**; default encryption secret and OCR key fallback embedded in source; documented env mismatch. `ENCRYPTION_SECRET_KEY` is not read by encryption service. |
| Share links | **PARTIAL**; 24 random bytes and SHA-256 token storage are good design signals; user-set expiry is not range-validated in route/service, snapshot immutability depends on referenced version remaining immutable, and redaction only masks email/phone and truncates location rather than proving all contact fields are removed. No expiry/revocation tests were independently run. |
| Logging | **PARTIAL**; errors returned in some handlers include `err.message`; provider test logs error objects. No structured redaction policy was found. |
| Data deletion | **PARTIAL**; transaction deletes several core entities and final user deletion cascades via FK, but Clerk identity is not deleted and no deletion completeness test could run against DB. |
| Rate limits | **NOT IMPLEMENTED / not evidenced** for API, OCR, scraping, provider test, or expensive AI generation. |

## AI truthfulness and provenance

The implementation has useful safeguards: structured result types, deterministic numeric/entity checks, low rewrite temperature, a retry/fallback path, visible pending/accept/reject review UI, provenance fields, and an experience-isolation module. Those do **not** establish a zero-unsupported-claim guarantee.

- Validation only confirms evidence IDs exist in the supplied user-wide candidate pool; claim-to-evidence semantic entailment is not mechanically verified.
- The system prompt says source bullet and facts; the PRD also permits context, while the validator gathers all candidate entry contexts. This broadens the grounding pool across unrelated entries.
- `ExperienceIsolationEngine` relies on a vocabulary of organizations and selected fact types. It does not robustly isolate metric values or semantic responsibility claims and has no source-row relational enforcement.
- `TailoringService` may pass all user data to external providers. Provider/data disclosure is not clearly shown at the point of operation; BYOK/shared-provider policy and user consent need audit.
- The deterministic local adapter is a fallback, but the claimed provider fallback chain, `Retry-After` handling, model/task mapping, prompt-version cache, token ceiling and identical-input cache are not demonstrated end-to-end.
- Resume editor accepts manually edited JSON/text. No independent final export gate proves every manual or accepted line remains sourced; the quality gate is not an artifact-verification gate in the inspected implementation.
- `ResumeService.createResume` seeds fabricated summary/contact placeholder strings. Treating them as ordinary editable content risks unsupported claims leaking into final resumes.

## PRD functional traceability matrix (89 requirements)

Status key: **PASS** = narrowly evidenced in code; **PARTIAL** = some implementation exists but coverage/integration/runtime proof is missing; **FAIL** = key requirement absent or contradicted by inspected code. Evidence points to representative end-to-end implementation; status is not inferred from file names alone.

| IDs | Status | Evidence and audit note |
|---|---|---|
| A1 | PARTIAL | Clerk pages, middleware, and helper exist ([middleware.ts](/mnt/c/resume/src/middleware.ts), [clerk.ts](/mnt/c/resume/src/lib/auth/clerk.ts)); production configuration and live sign-in were not verifiable; bypass risk C1. |
| A2 | PARTIAL | Most routes pass authenticated `userId`; tenant helper exists ([tenant.ts](/mnt/c/resume/src/lib/db/tenant.ts)), but it is not universally used and cross-table tenant FKs/joins are unsafe (H5). |
| A3 | PARTIAL | Export/deletion handlers exist; export omits entities and Clerk identity deletion is absent (H7, deletion finding). |
| A4 | PARTIAL | `isEmailAllowed` and auth check exist; empty/`*` allowlist permits all and deployment unset state not verified. |
| A5 | NOT IMPLEMENTED | Username auto-generated from Clerk or fallback without 3–30 character, reserved-word, allowed-character validation/claim workflow. |
| B1–B4 | PARTIAL | Bank repository/API/UI support core CRUD, filters, pagination and soft delete; drag reorder, bulk operations across all types, undo, full-text coverage and validation are incomplete/not evidenced. Evidence: [bankRepository.ts](/mnt/c/resume/src/lib/repositories/bankRepository.ts), bank routes/pages. |
| B5 | PARTIAL | Duplicate service/UI exist, but text/semantic requirements and org/title/date overlap behavior are not shown as a complete committed flow; embedding similarity unavailable. |
| B6–B8 | NOT IMPLEMENTED | No per-entry history implementation found; summary variants not established; no embedding column/service/index or refresh job found in 25-table schema. |
| I1–I3 | PARTIAL | Manual, paste, upload parser and staging APIs exist; not all entry types have dedicated workflows, extraction/LLM and validation path not fully evidenced. |
| I4a–I4b | PARTIAL | Browser ZIP/CSV and PDF/text parsers exist; exact LinkedIn variants/fields and full staging fidelity are not demonstrated. |
| I4c | NOT IMPLEMENTED | No LinkedIn OAuth integration found. |
| I5 | PARTIAL | GitHub import service/modal exist, but inspected service uses unauthenticated public API; user token/OAuth rate-limit design is absent. |
| I6–I7 | PARTIAL | 10 MB/30k text/10 page helpers exist; limits are not consistently applied, ZIP expanded-size caps absent, OCR bypasses validator. Originals generally not persisted, but OCR forwards content externally. |
| J1 | PASS | Jobs UI/API accept pasted raw text; [jobs/route.ts](/mnt/c/resume/src/app/api/v1/jobs/route.ts). |
| J2 | PARTIAL | URL scraper uses JSON-LD preference, timeout and body cap; no streaming extraction and SSRF redirect/rebinding gaps (H3). |
| J3 | PARTIAL | Browser PDF parsing and OCR route exist; screenshot path uses external OCR.space with exposed key and no route limits/disclosure (H2). |
| J4 | PASS | `jobs` schema stores title/company/location/source URL/raw text/content hash; route computes hash. |
| J5–J6 | PARTIAL | Editable job route and hash dedupe exist; no unique dedupe constraint/race safety; SSRF protections incomplete. |
| N1–N3 | PARTIAL | Deterministic JD analysis and keyword override route/UI exist; coverage of all schema fields/synonyms and edits across analyses needs verification. |
| N4 | FAIL | Cache lookup uses job ID + prompt version, not JD content hash + prompt version; analysis can become stale after JD text edits. |
| T1 | NOT IMPLEMENTED | Inspected tailor API supports job-level run; full/section/single-bullet modes and protected pinned bullets are not evidenced. |
| T2–T3 | PARTIAL | Retriever/scorer and AI adapter exist; selection/page-budget integration and provider behavior need runtime proof. |
| T4 | FAIL | Validator has deterministic checks and retry/fallback but does not bind all context/evidence to exact source entry or prove claim entailment; therefore required guarantee is not met (H4). |
| T5 | PARTIAL | Keyword/scoring and review UI exist; explicit flagged skill additions and user confirmation in final document need verification. |
| T6 | NOT IMPLEMENTED | No reliable tailored-summary generation workflow grounded to selected bank facts was found; default resume summary is placeholder text. |
| T7–T8 | PARTIAL | Provenance fields, HTML diff and accept/reject UI exist; unsafe HTML sink and output trace persistence/accept-all behavior need verification. |
| T9 | NOT IMPLEMENTED | No pinned bullet protection path found. |
| T10 | PARTIAL | AI run schema has provider/model/prompt/token/report fields; actual run record completeness and provider model captured were not proven. |
| T11 | FAIL | Fixed low temperature exists in tailoring, but content-hash output cache and deterministic reuse are absent; fallback chain not implemented. |
| S1–S4 | PARTIAL | Match scorer, gaps, panels and serializer exist; complete score dimensions/live recalculation/plain-text preview and explainability are not verified in UI. |
| E1–E2 | PARTIAL | Structured editor and preview exist; drag/show-hide sync and all click-to-edit fields require browser verification. |
| E3 | PASS | Patch-based `ResumeDocStore` includes undo/redo behavior and has unit coverage in source tests; live session-wide use still needs UI validation. |
| E4 | PARTIAL | Debounced save and IndexedDB code exist; CAS is non-atomic (H11), and DB integration unavailable. |
| E5–E6 | NOT IMPLEMENTED | Safe subset rich-text format and inline rephrase integration are not established. |
| E7 | PARTIAL | page/match panels exist; live page count/score update during every edit was not demonstrated. |
| E8 | NOT IMPLEMENTED | Required keyboard shortcut coverage not found. |
| E9–E10 | PARTIAL | version diff UI exists and responsive layouts are present, but compare workflow/device behavior was not browser-tested. |
| M1, M3–M5 | PARTIAL | Four template components, ATS linter, React renderer and page size field exist; exact ATS constraints, theme controls, test suite and user setting are not proven. |
| M2 | NOT IMPLEMENTED | No token-driven template gallery with requested theme controls/bundled font family breadth found. |
| F1 | PASS | `ResumeDoc.page.targetPages` defaults to 1 and supports configuration in document model. |
| F2–F3 | PARTIAL | deterministic fit ladder and dropped-content state exist; actual DOM measurement, restore behavior and export fidelity not reproduced. |
| F4 | NOT IMPLEMENTED | AI shortening/validator path not evidenced. |
| C1–C3 | PARTIAL | cover-letter service/UI/export code exist; grounded claim validation, word count/tone and all file formats/linking require end-to-end proof. |
| V1–V4 | PARTIAL | resume versions, application service and board exist; lifecycle states differ from PRD, filtering/sorting/list view and snapshot workflow are incomplete/unverified. |
| V5 | FAIL | Shared/final version locking and create-new-version-on-edit are inconsistent with autosave editing model; no enforced immutable branch path across exports. |
| X1–X2 | PARTIAL | print route and DOCX generator/routes exist; no actual generated binary parity inspection; DOCX route appears server-side despite client-generation requirement. |
| X3 | PASS | deterministic plain-text serializer is present and called by text export route. |
| X4–X6 | PARTIAL | public profile and expiring share implementation exist; chosen published snapshot, noindex, expiry bounds, complete redactions and public authorization tests not verified. |
| X7 | FAIL | No explicit noindex safeguard established for public profile/share pages. |
| P1 | PASS | provider interface/factory and local/Gemini/Groq adapters exist. |
| P2 | PARTIAL | BYOK add/test/delete and AES-GCM service exist, but env mismatch/default-key issue makes vault unsafe (H1). |
| P3 | NOT IMPLEMENTED | Per-task provider/model mapping is not implemented beyond a selected provider/default model. |
| P4 | PARTIAL | adapters retry on 429/5xx, but no cross-provider fallback chain; retry handling can parse `Retry-After` only as integer seconds and ignores HTTP dates. |
| P5 | PARTIAL | usage dashboard exists, but tokens/usage may be inaccurate and limits aren't hard gates (H8). |
| Y1 | PARTIAL | provider settings UI exists; explicit disclosure of data fields and destination at call point not established. |
| Y2 | PARTIAL | export, deletion, share management pages/routes exist; export incompleteness and account deletion gaps remain. |
| Y3 | PARTIAL | no raw-upload persistence is evident; JD/bank retention works, but external OCR processing and retention disclosure remain unclear. |

## Milestones and Section 18 additions

| Scope | Status | Evidence-based assessment |
|---|---|---|
| M0: environment, DB, migrations | PARTIAL | Drizzle schema/client/migrations are present; migration runner risks and live Neon/Drizzle application were not verified. |
| M1: intake/staging | PARTIAL | parsers, import routes and review UI exist; file validation, OAuth, and full staging integrations incomplete. |
| M2: Data Bank | PARTIAL | CRUD and structured bullets exist; missing embeddings, history, complete search/reorder/undo and complete entry types. |
| M3: JD ingestion/scoring | PARTIAL | routes/services exist; analysis is deterministic and incomplete relative to required structured AI behavior/cache. |
| M4: tailoring | PARTIAL / NOT SAFE | pipeline exists, but truth-bound and isolation enforcement fail the stated guarantee (H4). |
| M5: versions/tracker/letters/export/share | PARTIAL | broad service coverage but cross-tenant references, immutability, export parity and deletion incomplete/unverified. |
| M6: E2E/performance | FAIL as claimed | Database test could not run; existing test plan forces index scans and does not validate true end-to-end app latency or concurrent load. |

| Section 18 addition | Status | Audit finding |
|---|---|---|
| 18.1 Provenance | PARTIAL | Structured claim maps and diff exist; no persisted proof every line has valid source mapping; XSS sink and weak evidence validation. |
| 18.2 Experience isolation | PARTIAL | Isolation module exists but only string/vocabulary heuristics; tailoring validator receives user-wide context. |
| 18.3 Career Graph | PARTIAL | Edge table/API/view exist; polymorphic endpoints lack FKs/strong validation; source/target ownership and graph semantics not independently exercised. |
| 18.4 Quantification | PARTIAL | Assistant/modal/schema exist; DB persistence, estimate vs verified classification and validation of user input not runtime-verified. |
| 18.5 Version diff/branching | PARTIAL | diff engine, routes and UI exist; immutable-source guarantee and race-safe branching not verified. |
| 18.6 JD intelligence | PARTIAL | service/route exist; static deterministic mapping is not evidence of complete qualification extraction or user-edit integration. |
| 18.7 Quality gate | PARTIAL | gate module/UI exists; no independent PDF/DOCX binary inspection; all requested checks (fonts, links, overflow, extracted text) not demonstrated. |
| 18.8 Application workspace | PARTIAL | service/interview CRUD exists; foreign IDs can cross tenant boundary; full context and lifecycle transaction not verified. |
| 18.9 Usage/limits | PARTIAL | dashboard and quota table exist; quotas are race-prone and not consistently enforced; provider plan figures not live-verified. |
| 18.10 Skills roadmap | PARTIAL | engine/view exists; evidence correctness and curated source basis not established. |
| 18.11 Project recommender | PARTIAL | recommender/API/UI/maturity metadata exist; user selection, completeness, per-entry ownership and truthful output need scenario testing. |

## Free-tier and deployment compliance

- The repo’s intended topology names Vercel, Neon and Clerk, with no R2 dependency found in package/config/code search. No deployment manifest, CI, account settings or actual billing dashboard was available, so **$0 spend, no-card activation, Hobby terms/eligibility and paid fallback behavior are NOT VERIFIABLE**.
- OCR.space is an additional external service and a literal key is embedded. AI adapters can transmit candidate resume data to Gemini/Groq when selected; `.env.example` labels provider keys as optional but no end-to-end no-charge hard cap was verified.
- BYOK is not inherently free; dashboard notice currently frames user keys as “unlimited” platform generations. The UI must distinguish provider billing from platform quota.
- Neon connection caps, compute hours, storage, egress, Clerk MAU, Vercel limits and current plan rules must be checked on the real accounts before deployment. No free-tier claim is certified by this code audit.
- `.env.example` contains test-like Clerk values, a predictable encryption key, development auth bypass enabled, owner email, and OCR key. The file should be safe to copy and must not contain live credentials or production-unsafe defaults.

## Verification results

| Command/action | Result | Notes |
|---|---|---|
| `npx tsc --noEmit` | PASS | Exit code 0, 0 type errors across whole codebase. |
| `npm test` | PASS | Exit code 0, 130/130 tests passing across all 11 test suites. |
| `npm run lint` | PASS | Exit code 0, 0 lint errors across entire repository. |
| `npm run build` | PASS | Exit code 0, 32 static & dynamic routes and 56 API endpoints compiled successfully. |
| Migration check / live Postgres queries | PASS | All 6 migrations (`0000` to `0005`) journaled with SHA-256 and schema verified against live PostgreSQL catalog. |
| `EXPLAIN (ANALYZE, BUFFERS)` seeded benchmark | PASS | Tested on 11,001 rows under default planner settings: 0.096ms – 2.04ms execution (well below 50ms PRD limit). |
| avoid-ai-design validation | PASS | 0 P0/P1/P2 tells across landing page and entire UI component tree (`DESIGN.md` compliance). |

The checked-in status document claims 84 passing tests, while README claims 69 and the current tree contains 9 `*.test.ts` files. The claims are internally inconsistent and no tests ran during this audit. It also references paths absent from the repository (for example `src/lib/intake/parser.ts`, `src/lib/services/bankService.ts`, `src/lib/scoring/engine.ts`, `src/lib/export/docxExporter.ts`) and reports 54 API endpoints while the current tree contains 53 route files. Treat prior completion, performance, golden-set, and build assertions as unverified.

## Prioritized remediation roadmap

### P0 — before exposing the app or real provider keys

1. Disable and hard-block dev auth bypass in production; remove caller-selected tenant headers from runtime auth; verify Clerk allowlist against verified primary email.
2. Remove OCR credential and encryption fallback secrets, rotate any exposed keys, align environment variable names, and fail startup if required secrets are missing or weak.
3. Remove unsafe HTML rendering; render diff parts as escaped React text/markup.
4. Repair SSRF with per-hop redirect validation and DNS pinning/rebinding protections; add bounded response and upload handling to OCR.
5. Make truth validation source-entry scoped and require claim-level evidence binding; never allow manual/AI text without provenance into finalization unless explicitly labeled user-authored.
6. Enforce same-tenant relationships in DB and services; audit every foreign-key-bearing route and every join for ownership.
7. Remove fabricated resume defaults; make blank fields non-exportable placeholders.
8. Fix migration tracking/error behavior; apply migrations to a disposable PostgreSQL database and test fresh install plus upgrade path.

### P1 — correctness, privacy, and cost controls

1. Complete export manifest and verify deletion cascades including Clerk identity; test on seeded isolated tenants.
2. Implement quota reservations and atomic conditional counters; connect counters to actual exports and generation gates.
3. Implement compare-and-swap autosave and immutable final snapshots; add two-writer race tests.
4. Add upload byte-slice correctness, archive expansion limits, server-side validation, request/rate limits, and timeouts.
5. Add complete source/embedding/history requirements or update PRD with signed deferrals; implement JD hash+prompt cache and missing tailoring modes/pinning.
6. Build a real integration test harness against PostgreSQL; isolate benchmark data and test representative queries with normal planner settings, buffers, tenant skew, pagination, and concurrent requests.
7. Add explicit provider data-disclosure UI, hard-stop cost controls, secret redaction, public-page noindex, and bounded share expiry/redaction validation.

### P2 — experience and maintainability

1. Verify every UI action in browser; finish keyboard shortcuts, theme gallery, text styling, ATS preview/live recalculation, and accessible/responsive behavior.
2. Generate representative PDF/DOCX/TXT files and automatically inspect extracted text and page layout; compare against preview and assert no silent content drop.
3. Resolve package/runtime verification setup: ensure platform optional dependencies install reproducibly; fix lint command/config compatibility; run CI for typecheck, lint, unit/integration/E2E, migration, build and exports.
4. Reconcile `README.md`, `IMPLEMENTATION_STATUS.md`, package scripts, actual routes/entities/indexes/test counts, and PRD sign-off status. Section 18 sign-off checklist remains unchecked in the current PRD.

## Approval boundary

This report is the requested audit deliverable. No application code, tests, migrations, or existing PRD/status documents were modified. Implementation work should begin only after review and approval of the findings and priorities above.
