# Resume Maker: Product Requirements Document

| Field | Value |
|---|---|
| Status | Draft v1.1, implementation-ready subject to spikes and sign-off |
| Date | 2026-11-18 |
| Owner | Spectre |
| Working title | "Resume Maker" (name is an open question, see OQ-01) |
| Audience for v1 | Personal tool first, architected so other people can use it later |
| Confirmed deployment direction | Next.js on Vercel, Neon PostgreSQL, Drizzle ORM, Clerk; Cloudflare Workers Free only for narrowly scoped edge tasks |
| Hard constraints | $0 spend; no credit-card-required activation; no paid subscriptions, trials, usage-based billing dependencies or automatic paid fallback |

**How to read this document.** Sections 1–6 preserve the original product decisions and functional requirements. Sections 7–15 and Appendices A–D complete the architecture and implementation specification. This v1.1 revision replaces the earlier D1/R2/Cloudflare-hosted direction with Vercel + Neon PostgreSQL and explicitly excludes services that require payment-card activation. Where later sections refine an earlier requirement, the later section is authoritative. Vendor plan details were checked on 2026-11-18 and must be rechecked against the actual accounts before deployment.

---

## 1. Overview

### 1.1 Problem
Tailoring a resume to each job is slow and error-prone. Achievements live in scattered documents, keywords from the job description (JD) get missed, formatting breaks between Word and PDF, and nobody remembers which version went to which company.

### 1.2 Product
A web app where you keep one structured **Data Bank** of everything about your career. You give it a job description (pasted, scraped from a URL, or uploaded as PDF/screenshot). It produces a **tailored resume** built only from your own facts, plus an ATS match score and an optional cover letter. You refine the result in an **in-built editor** (structured form plus click-to-edit on a live preview), then finalize and download (PDF, DOCX, plain text) or share (public profile page, expiring links).

### 1.3 Product principles
1. **Truth-bound.** The AI may rephrase and prioritize facts that exist in the Data Bank. It never invents claims, metrics, employers, titles or tools.
2. **Data Bank is the source of truth.** A resume is a *view* over the bank plus explicit overrides, so every line has provenance.
3. **Human in the loop.** Every AI change is visible, flagged where risky, and reversible.
4. **Client computes, server handles trusted I/O.** Heavy work (parsing, layout measurement, DOCX generation) runs in the browser; trusted persistence and provider calls run server-side on Vercel. Optional Workers must remain thin and non-critical.
5. **Free-tier first.** Every feature has a usage budget and a graceful degradation path.
6. **Portable.** Full JSON export of all user data at any time.

---

## 2. Goals, non-goals, success metrics

### 2.1 Goals
- **G1.** From JD to export-ready tailored resume in under 10 minutes (target: under 5) once the Data Bank is populated.
- **G2.** Zero unsupported facts in AI-generated text that reaches the resume (enforced by a deterministic validator, see 10.4).
- **G3.** One-page fit without manual fiddling in at least 90% of runs.
- **G4.** Resumes that parse cleanly in ATS systems (selectable text, standard headings, single-column fixed templates).
- **G5.** Total monthly spend of zero.

### 2.2 Proposed non-goals (confirm or overrule)
- Not a job board; no job search or auto-apply.
- No email/calendar integration for the tracker in v1.
- No real-time collaboration.
- No native mobile app (responsive web only).
- English-only resumes in v1.
- No bring-your-own-template upload (you picked fixed ATS-safe templates plus themeable ones only, see D-09).

### 2.3 Success metrics
| Metric | Target | How measured |
|---|---|---|
| Time from JD input to export | ≤ 5 min median | Event timestamps |
| Unsupported-fact rate after validator | 0 | Golden-set evaluation (13.2) |
| ATS score uplift vs. untailored baseline | ≥ +15 points average (tune) | Evaluation set |
| One-page auto-fit success | ≥ 90% | Auto-fit run logs |
| PDF text parity with preview | ≥ 99% | Automated text-extraction diff |
| Paid-plan spend | $0 | Vendor dashboards |

---

## 3. Decision log

### 3.1 Decisions you made
| ID | Topic | Decision |
|---|---|---|
| D-01 | Audience | You first, but built so others can use it later |
| D-02 | Data Bank intake | All four routes: manual forms, upload and parse existing resume (PDF/DOCX), LinkedIn/GitHub import, pasted free text structured by AI |
| D-03 | Tailoring | AI rewrites bullets to match the JD, bounded by D-04 |
| D-04 | Rewrite freedom | Strict: only rephrase facts already in the Data Bank, never add claims or metrics (the bank must already contain the metrics). AI **may add JD keywords to the skills section** that you haven't listed, **flagged for your review** |
| D-05 | Editor | Structured form **plus** click-to-edit on the preview |
| D-06 | Downloads | PDF, DOCX, plain text (for ATS paste boxes), shareable link |
| D-07 | Sharing | Public profile page at a custom username **and** links that expire after a set time |
| D-08 | JD input | Pasted text, job-posting URL (scraped), uploaded PDF/screenshot |
| D-09 | Templates | A few fixed ATS-safe templates **and** many templates with theme controls (fonts, colors, spacing) |
| D-10 | AI providers | Switchable between providers **and** bring-your-own API key |
| D-11 | Stack | Next.js on Vercel + Neon PostgreSQL + Drizzle + Clerk; Cloudflare Workers Free only where useful and eligible without payment-card activation |
| D-12 | v1 extras | ATS match score and keyword-gap report; per-job resume versions and application tracker; cover letter generation from the Data Bank; one-page auto-fit |
| D-13 | Data Bank structure | Entries hold atomic bullets **plus** optional free-form context |
| D-14 | LinkedIn import | Pasted profile text, official LinkedIn data export (ZIP/PDF), and LinkedIn OAuth (limited fields) |
| D-15 | Cost | $0 spend and no service requiring a payment card to activate its free tier; no paid fallback or auto-upgrade |
| D-16 | PDF generation | Delegated to me; see R-01 |

### 3.2 My recommendations awaiting your sign-off
| ID | Recommendation | Section |
|---|---|---|
| R-01 | PDF export: browser-native print-to-PDF from the canonical React template; no Browser Run or object storage dependency | 7.8 |
| R-02 | Architecture rule: browser does document compute; Vercel handles Next.js server/API routes and Neon access; Cloudflare Workers are optional edge utilities only | 7.2 |
| R-03 | Deploy the Next.js application on Vercel Hobby; use Vercel Route Handlers/server functions for app APIs unless a specific edge task justifies a Cloudflare Worker | 7.2 |
| R-04 | AI provider routing remains configurable; do not make Workers AI, Groq or Gemini mandatory until no-card activation, free limits and privacy terms are verified | 7.5 |
| R-05 | Embedding pre-filter before any LLM call to keep each run ≤ 7K tokens | 10.3 |
| R-06 | Before/after diff view and accept/reject per AI change | 6.6 |
| R-07 | Imports land in a staging area for review before touching the bank | 6.3 |
| R-08 | Resume = view over Data Bank plus overrides | 8.1 |
| R-09 | DOCX generated client-side | 7.8 |
| R-10 | Initial scoring weights (tunable) | 10.2, 10.5 |
| R-11 | BYOK keys stored server-side, AES-GCM encrypted | 7.10 |
| R-12 | Signup allowlist while the app is personal, to protect free-tier quotas; implement in app middleware/server logic, not a paid Clerk feature | 6.1 |

---

## 4. Users and release scope

**Primary user (v1): you.** Heavy Data Bank owner, applies to many roles, wants speed and control.
**Secondary users (later): job seekers**, especially students and early-career applicants who apply to many roles and need ATS-safe output.

| Phase | Scope |
|---|---|
| **P1: Personal MVP** | Single-user usage on a multi-tenant schema. Core loop: bank, JD, tailor, edit, export. Plus score, auto-fit, versions/tracker, cover letter, sharing |
| **P2: Open to others** | Signup quotas, BYOK polish, public-profile safeguards, privacy pages, rate limiting, account deletion flow |
| **P3: Parking lot** | Mobile editing polish, multi-language, email integration, template marketplace |

---

## 5. Core user flows

**Flow A: First-time setup**
1. Sign in (Clerk).
2. Choose intake route(s): upload resume, paste text, import LinkedIn export, GitHub, or manual forms.
3. Review staged items (accept, edit, reject, merge duplicates).
4. Bank health screen shows gaps (bullets without metrics, entries without dates).
5. Optionally add an AI provider key (BYOK).

**Flow B: Tailor a resume**
1. New Job: paste JD, paste URL, or upload PDF/screenshot.
2. Review the extracted JD analysis (must-have vs nice-to-have keywords). Promote or demote keywords.
3. Run Tailor. The engine selects bullets, rewrites under the strict rules, reorders skills, and proposes flagged skill additions.
4. Review changes (diff, provenance badges, flags). Accept all safe changes or go one by one.
5. See ATS score, gap report, and page-fit status.

**Flow C: Edit and finalize**
1. Edit via the form panel or click directly on the preview.
2. Pick template and theme. Auto-fit trims to the page target.
3. Mark Final. A named version is stored.
4. Download PDF, DOCX or TXT.

**Flow D: Share**
1. Publish a resume to your public profile (`/u/{username}`) and/or create an expiring link.
2. Choose redactions (hide phone, email).
3. Revoke or let links expire.

**Flow E: Track**
1. Attach the resume version and cover letter to an application.
2. Move it through statuses; set follow-up dates.

---

## 6. Functional requirements

Priority: **P0** = required for MVP, **P1** = v1 but can follow MVP, **P2** = later.

### 6.1 Authentication and account (FR-A)
| ID | Requirement | Pri |
|---|---|---|
| A1 | Sign-in via Clerk (methods configured in Clerk; see OQ-03) | P0 |
| A2 | Every database row is scoped by `user_id`; every query goes through a scoped data-access helper | P0 |
| A3 | Full JSON export of all user data; account deletion cascades to all owned PostgreSQL rows and any explicitly enabled external artifacts | P0 |
| A4 | Signup allowlist (environment-configured) while the app is personal (R-12) | P1 |
| A5 | Username claim with validation (3-30 chars, `[a-z0-9-]`, reserved-word list, unique) | P1 |

### 6.2 Data Bank (FR-B)
**Entry types:** profile/contact, experience, education, project, skill group, certification, award, publication, activity/volunteer, custom section.

**Atomic bullet.** The smallest unit of achievement. Fields: `text`, `facts` (structured metrics, tools, scope), `tags`, `visibility`, usage stats. Each entry may also hold a free-form `context` note (situation, constraints, what you did). The AI may use context as evidence when rephrasing, because it is part of the bank (D-13).

**Metric structure** (used by the validator, section 10.4): `{ value, unit, label, kind: percent | currency | count | duration | scale }`.

| ID | Requirement | Pri |
|---|---|---|
| B1 | CRUD, drag-reorder, bulk edit, tag filter, full-text search for all entry types | P0 |
| B2 | Atomic bullets with structured `facts` and tags; optional free-form context per entry | P0 |
| B3 | Completeness checks: bullet lacks a metric, entry lacks dates, skill lacks evidence | P0 |
| B4 | Soft delete with undo; hard delete on account deletion | P0 |
| B5 | Duplicate detection (same org + title + overlapping dates; near-identical bullets by text hash and embedding similarity) | P1 |
| B6 | Change history per entry | P1 |
| B7 | Summary/headline variants stored as bank items (AI composes a tailored summary from facts) | P1 |
| B8 | Embeddings per bullet, refreshed when text changes | P0 |

### 6.3 Data Bank intake (FR-I)
All imports go to a **staging area** (R-07). Each staged item shows its source snippet, a confidence indicator, and accept/edit/reject/merge actions. Nothing enters the bank without confirmation.

| ID | Requirement | Pri |
|---|---|---|
| I1 | Manual forms for every entry type | P0 |
| I2 | **Resume upload (PDF/DOCX).** Text is extracted **in the browser** (R-02), sent to the API as text, structured by the LLM into the bank schema, validated by Zod, staged | P0 |
| I3 | **Paste free text.** AI structures it into entries and atomic bullets | P0 |
| I4a | **LinkedIn official data export (ZIP).** Unzipped in the browser; structured CSVs mapped deterministically; LLM used only to atomize long descriptions into bullets. Typical files include positions, education, skills, projects **[verify exact file names at build time]** | P1 |
| I4b | **LinkedIn "Save to PDF" or pasted profile text.** Treated like I2/I3 | P1 |
| I4c | **LinkedIn OAuth (limited fields).** Expect identity prefill only (name, email, photo); full profile data is not available through the standard sign-in product **[verify current scopes]** | P1 |
| I5 | **GitHub import.** User picks repos; public metadata (name, description, languages, topics, README excerpt) becomes project entries. Unauthenticated API rate limits are low, so use OAuth or a user token for the import **[verify current limits]** | P1 |
| I6 | Limits: file ≤ 10 MB, ≤ 10 pages, pasted text ≤ 30,000 characters | P0 |
| I7 | Original uploaded files are **not retained** by default; only extracted structured data is stored (optional retention is OQ-09) | P0 |

### 6.4 Job description ingestion (FR-J)
| ID | Requirement | Pri |
|---|---|---|
| J1 | Paste JD text | P0 |
| J2 | **URL import.** Worker fetches the page. Preferred extraction order: `JobPosting` JSON-LD if present, then streaming HTML text extraction. If the site blocks the fetch or the page needs login, ask the user to paste the text | P0 |
| J3 | **PDF upload:** text extracted in the browser. **Screenshot/image upload:** sent to a vision-capable model; images contain no personal data by design (a JD), so the free-tier Gemini vision path is acceptable (R-04) | P1 |
| J4 | Normalized job record: title, company, location, source URL, raw text, hash | P0 |
| J5 | Editable JD text before analysis; dedupe by content hash | P0 |
| J6 | URL fetch safeguards: https only, no IP literals or internal hostnames, 1 MB body cap, 8 s timeout | P0 |

### 6.5 JD analysis (FR-N)
LLM extracts a structured analysis (schema in Appendix A). The result is shown to the user and is editable, because keyword weights drive both tailoring and the ATS score.

| ID | Requirement | Pri |
|---|---|---|
| N1 | Extract role title, seniority, domain, location/remote, years of experience, education requirement | P0 |
| N2 | Extract `must_have` and `nice_to_have` skills, responsibilities, soft skills, with canonical keyword forms and synonyms (for example "JS" and "JavaScript") | P0 |
| N3 | User can promote, demote, add or remove keywords before tailoring | P0 |
| N4 | Analysis cached by JD hash + prompt version | P0 |

### 6.6 Tailoring engine (FR-T)
| ID | Requirement | Pri |
|---|---|---|
| T1 | Modes: full resume, single section, single bullet ("rephrase for this JD") | P0 |
| T2 | **Selection** under a page budget using the relevance score (10.2, 10.3) | P0 |
| T3 | **Rewrite** shortlisted bullets to match JD language, bound by D-04: rephrase and reorder only; no new numbers, tools, employers, titles or claims | P0 |
| T4 | **Validator** (deterministic code, not the LLM) rejects any rewrite containing facts not present in the source bullet, its entry facts, or its entry context (10.4). On failure: one repair retry, then fall back to the original bullet and flag it | P0 |
| T5 | **Skills section:** reorder by JD relevance. JD keywords not in your bank are proposed as **flagged additions**, never auto-accepted (D-04). Each shows "not in your Data Bank: add only if true" | P0 |
| T6 | **Summary:** a 2-3 line tailored summary composed only from bank facts | P1 |
| T7 | **Provenance badges** on every line: `bank`, `ai-rewrite`, `manual`; flagged items are visually distinct | P0 |
| T8 | **Diff view** (before/after) with accept/reject per change and "accept all validator-passed changes" (R-06) | P1 |
| T9 | **Pin** a bullet to protect it from rewriting | P1 |
| T10 | Run record stores provider, model, prompt version, token counts, validator report | P0 |
| T11 | Low temperature (≤ 0.3) for rewrites; identical inputs reuse cached outputs | P1 |

### 6.7 ATS match score and gap report (FR-S)
| ID | Requirement | Pri |
|---|---|---|
| S1 | Score 0-100 with breakdown (must-have coverage, nice-to-have coverage, title/seniority alignment, parseability checks, formatting risks) per 10.5 | P0 |
| S2 | **Gap report** for each missing keyword with a status: **in your bank but unused** (action: add from bank), or **not in your bank** (action: none; add real experience to the bank first). The tool never suggests claiming it | P0 |
| S3 | Live recalculation as you edit (client-side, no AI call) | P1 |
| S4 | Plain-text extraction preview ("how an ATS may read this") | P1 |

### 6.8 Editor (FR-E)
| ID | Requirement | Pri |
|---|---|---|
| E1 | **Form panel:** section list with drag-reorder, show/hide toggles, entry and bullet editors, provenance badges | P0 |
| E2 | **Click-to-edit preview:** click any text on the rendered resume to edit it in place; changes sync to the form and the underlying JSON | P0 |
| E3 | Undo/redo (patch-based, session-wide) | P0 |
| E4 | Autosave (debounced ~1.5 s) to Neon PostgreSQL with optimistic-concurrency version check; local IndexedDB draft as safety net | P0 |
| E5 | Inline formatting limited to a safe subset (bold, italic, link); everything else plain text | P0 |
| E6 | Inline "rephrase this bullet for this JD" under the same validator | P1 |
| E7 | Live page-count and ATS-score indicators | P1 |
| E8 | Keyboard shortcuts for section navigation, undo/redo, accept/reject | P1 |
| E9 | Compare against base resume or an earlier version | P1 |
| E10 | Responsive layout for tablet; phone is read-mostly | P2 |

### 6.9 Templates and theming (FR-M)
| ID | Requirement | Pri |
|---|---|---|
| M1 | 3-4 **fixed ATS-safe** templates: single column, standard section headings, no tables, icons or text boxes | P0 |
| M2 | A **themeable gallery** of additional templates driven by tokens: font family (bundled open-license fonts), base size, heading scale, accent color, spacing density, margins, divider style, date alignment, bullet glyph, page size, section order | P1 |
| M3 | **ATS-safe lint:** warns when theme choices reduce parseability (for example multi-column layouts, tiny fonts, low contrast) | P1 |
| M4 | Every template is a React component taking `ResumeDoc` and theme tokens, with print CSS (`@page`), and passes the template test suite (13.3) | P0 |
| M5 | Default page size is a user setting (A4 or Letter; see OQ-05) | P0 |

### 6.10 One-page auto-fit (FR-F)
| ID | Requirement | Pri |
|---|---|---|
| F1 | Target page count setting (default 1) | P0 |
| F2 | Deterministic **fit ladder** (10.6): tighten spacing, then font size, then margins (each down to template-defined floors), then drop lowest-relevance bullets, then switch to a compact template variant | P0 |
| F3 | Never silently delete content: dropped bullets are listed and restorable | P0 |
| F4 | Optional "AI shorten" for over-long bullets, subject to the same validator | P1 |

### 6.11 Cover letter (FR-C)
| ID | Requirement | Pri |
|---|---|---|
| C1 | Generate a cover letter from the JD analysis, selected top bullets and profile; facts must pass the same validator | P1 |
| C2 | Editable in the same editor shell; target 250-350 words; tone setting (see OQ-08) | P1 |
| C3 | Export as PDF, DOCX, TXT; linked to the job and application | P1 |

### 6.12 Versions and application tracker (FR-V)
| ID | Requirement | Pri |
|---|---|---|
| V1 | **Per-job resume:** forks from a base resume; links to the job | P0 |
| V2 | Version snapshots (autosave checkpoints, manual named versions, post-AI-run snapshots); restore and compare | P1 |
| V3 | **Tracker:** statuses Saved, Applied, Screening, Interview, Offer, Rejected, Withdrawn; fields: company, role, job link, resume version, cover letter, applied date, follow-up date, notes | P0 |
| V4 | List and board views, filter by status, sort by date | P1 |
| V5 | A shared or exported resume version is locked from accidental edits (new edits create a new version) | P1 |

### 6.13 Export and sharing (FR-X)
| ID | Requirement | Pri |
|---|---|---|
| X1 | **PDF** with selectable text, matching the preview (R-01) | P0 |
| X2 | **DOCX** generated in the browser from `ResumeDoc` using ATS-friendly styles (no tables, text boxes, or images for text) (R-09) | P0 |
| X3 | **Plain text** serializer (deterministic, ATS paste-box friendly) | P0 |
| X4 | **Public profile** at `/u/{username}`: serves a published snapshot of a chosen resume version | P1 |
| X5 | **Expiring links** `/s/{token}`: unguessable token, user-set expiry, revocable, immutable snapshot taken at creation (see OQ-07) | P1 |
| X6 | Redactions per share (hide phone, email, address) applied when the snapshot is generated | P1 |
| X7 | Public pages are `noindex` by default (see OQ-06) | P1 |

### 6.14 AI provider settings (FR-P)
| ID | Requirement | Pri |
|---|---|---|
| P1 | Provider abstraction with adapters (10.7 / 7.5) | P0 |
| P2 | **Bring your own key:** add, test, rotate, delete keys; show last 4 characters only | P1 |
| P3 | Per-task model mapping (parse, analyze, rewrite, cover letter, vision, embeddings) configurable | P1 |
| P4 | Fallback chain on 429/5xx with `Retry-After` handling | P0 |
| P5 | Usage dashboard: tokens and runs today versus platform limits | P1 |

### 6.15 Settings and privacy (FR-Y)
| ID | Requirement | Pri |
|---|---|---|
| Y1 | Clear disclosure of which provider processes which data (7.10) | P0 |
| Y2 | Data export, account deletion, share-link management page | P0 |
| Y3 | Default retention: raw uploads not stored; JD text and bank retained until deleted | P0 |


---

# Resume Maker PRD v1.1 — Deployment and Performance Revision

> This addendum completes the v0.1 draft. Version 1.1 revises the deployment architecture to Vercel + Neon PostgreSQL, removes D1 and R2 from the selected design, adds an explicit no-payment-card activation constraint, and strengthens database integration and query-performance requirements. Where this addendum is more specific than v0.1, this addendum is authoritative. Vendor quotas are snapshots checked on 2026-11-18 and must be rechecked before deployment.

## 7. Architecture and infrastructure

### 7.1 Architecture decisions

The application uses a browser-heavy, serverless architecture. Next.js is deployed on Vercel Hobby and provides the UI, server components and Route Handler/API layer. Neon PostgreSQL is the system-of-record relational database; Drizzle ORM manages schema, migrations and queries; Clerk provides authentication. Cloudflare Workers Free are optional and limited to isolated edge utilities such as safe job-description URL retrieval if that capability is needed and the account can use it without adding a payment method. The browser performs document parsing, DOCX construction, layout measurement, preview rendering and deterministic client-side transformations where feasible. Vercel server functions handle authorization, database access, provider calls, orchestration and share resolution.

**Deployment decision:** deploy the full Next.js application to Vercel. Do not split the app into a static export plus a mandatory Cloudflare API Worker. Keep one primary application origin and one server-side API boundary to reduce cross-origin, auth-cookie, deployment and debugging complexity. Cloudflare Workers are optional, isolated utilities only; the core app must remain fully functional if no Cloudflare Worker is deployed. This is tracked as S-1.

### 7.2 High-level topology

```text
Browser (Next.js application on Vercel)
  ├── Clerk client SDK (sign-in/session)
  ├── IndexedDB (unsaved draft cache)
  ├── PDF/DOCX/text extraction and generation
  ├── Resume preview + deterministic layout/ATS checks
  └── HTTPS calls to same-origin Next.js Route Handlers
         │ Clerk session token/cookie
         ▼
Vercel Next.js server / Route Handlers
  ├── Auth middleware: verify Clerk session/JWT
  ├── Tenant-scoped service and repository layers
  ├── Zod request/response validation
  ├── AI provider adapter + quota guard
  ├── Safe JD URL fetcher (or optional Cloudflare Worker utility)
  ├── Share-link resolver
  └── Drizzle ORM + Neon serverless driver
         │
         └── Neon PostgreSQL (pooled connection endpoint)
              users, bank, jobs, resumes, versions, applications,
              imports, AI runs, shares, provider settings, audit events

Optional Cloudflare Worker (Free, non-critical)
  └── Isolated edge URL-fetch/extraction utility only; no database ownership

External providers: selected LLM, GitHub API, Clerk
```

### 7.3 Runtime boundaries

| Workload | Runtime | Reason / constraint |
|---|---|---|
| UI, editor, preview | Browser | Interactive and compute-heavy |
| PDF/DOCX text extraction | Browser | Avoid Worker CPU and file-processing limits |
| DOCX creation | Browser | Generate from canonical ResumeDoc |
| Resume page measurement | Browser | Must match rendered template |
| ATS deterministic checks | Browser, revalidated server-side where persisted | Fast recalculation without LLM calls |
| Auth verification and data access | Vercel server / Route Handler | Central authorization boundary |
| AI calls | Vercel server proxy | Keep platform keys off the client; enforce quotas |
| JD URL retrieval | Vercel server by default; optional Cloudflare Worker | Controlled fetch with SSRF protections; avoid a mandatory second service |
| PDF rendering | Browser-native print-to-PDF | No server-side browser or object-storage dependency |
| Long-running work | Resumable job records + bounded requests | No assumption of unlimited request duration |

No request should rely on a single Vercel Function invocation to parse a large file, call multiple LLMs, render a PDF and persist the entire result. Split work into explicit steps. Each step must be idempotent and persist its state before returning. Respect Vercel Hobby function duration and resource limits; long tasks must be resumable and user-triggered rather than relying on always-on workers or paid workflow services.

### 7.4 Environments and deployment

- Environments: `local`, `preview`, `production`; each has separate Clerk application settings, Neon database/branch and secrets. Preview deployments must never point to production data.
- Use Vercel project environments and environment-specific variables. Use separate Neon branches or databases for local/preview/production; production data must never be used by preview deployments. Wrangler configuration is required only if an optional Cloudflare Worker is deployed.
- Database changes use versioned Drizzle migrations committed to source control. Migrations run as a deliberate deployment step, not at application startup.
- Deploy immutable application builds. Record build SHA, schema version and prompt versions in diagnostics.
- Secrets are configured through Vercel environment variables (and Cloudflare Worker secrets only for optional Worker code), never committed to Git or exposed through `NEXT_PUBLIC_*` variables.
- Backups: use Neon-supported restore/branching capabilities available on the actual Free plan plus periodic user JSON exports. Verify retention and restore limits before relying on them; perform a documented restore test. Do not assume paid point-in-time restore features are included.

### 7.5 Provider strategy

Implement a provider-neutral interface with adapters for supported providers. Do not hard-code Groq, Gemini or Workers AI into product logic.

```ts
interface LlmProvider {
  generateStructured<T>(input: {
    task: "parse_resume" | "parse_jd" | "analyze_jd" | "rewrite" | "cover_letter" | "vision";
    systemPrompt: string;
    userPayload: unknown;
    schema: unknown;
    maxOutputTokens: number;
    temperature: number;
    idempotencyKey: string;
  }): Promise<{ data: T; model: string; usage?: TokenUsage }>;
}
```

- Default provider/model is configured only after a live quality, privacy, rate-limit and free-tier test. A provider's free tier may be unsuitable for production or may use submitted content to improve its services; disclose this before sending personal data.
- User BYOK keys are optional. A BYOK key must be tested, scoped to the user's account, encrypted at rest, masked in the UI and deletable immediately. Never log the key or include it in error messages.
- A provider fallback is allowed only if the user has consented to that provider receiving their data. Do not silently send a resume to a second provider.
- If no provider is available or a quota is exhausted, preserve the user's work and show a clear retry/manual workflow. Do not quietly switch to a paid endpoint.
- Embeddings are optional optimization, not a correctness dependency. P0 selection must have a deterministic lexical fallback so the product still works if embedding service is unavailable.

### 7.6 Background and resumable jobs

Use a `jobs` table as a lightweight state machine for tasks that may exceed a single request. Initial implementation does not require paid queues.

States: `queued`, `running`, `succeeded`, `failed`, `cancelled`, `needs_user_action`.

Each task stores `task_type`, `user_id`, `input_ref`, `progress_stage`, `attempt_count`, `idempotency_key`, `lease_expires_at`, `last_error_code`, `created_at`, `updated_at`, and `completed_at`. A Vercel Route Handler claims a job with a conditional PostgreSQL update and short lease. On failure, retry only transient errors with exponential backoff and jitter; cap retries (default 3). Permanent validation, auth, quota and unsupported-file errors are not retried. Do not require Cloudflare Queues, Vercel Workflows, cron or another paid/background service for P0. Use user-triggered polling and bounded continuation requests on the free path; add a queue only after its no-card eligibility and free allowance are verified.

### 7.7 Caching

- JD analysis cache key: SHA-256 of normalized JD text + parser version + analysis prompt version + model family.
- AI rewrite cache key: source bullet IDs and versions + selected JD keyword set + prompt version + model ID + rewrite settings.
- Resume render cache key: canonical ResumeDoc hash + template version + theme tokens + page settings.
- Cache entries are user-scoped unless the cached object contains no user data. Never share cached personal content across users.
- Cache invalidation occurs when any source item, prompt, schema, template or scoring version changes.

### 7.8 PDF and document export

**Recommended default: browser-native print-to-PDF from the exact React resume template.** It is the lowest-cost and most deterministic option for a personal-first tool because it avoids a server-side browser dependency and keeps the preview and PDF renderer aligned. Provide a dedicated print route, wait for fonts and layout stabilization, use `@page` and print CSS, then invoke the browser print dialog. The user can save as PDF. Browser support and page breaks must be covered by automated tests.

**No server-side PDF service is required.** Cloudflare Browser Run is excluded from the required architecture because its activation and account eligibility have not been verified against the no-payment-card constraint, and it adds a second runtime. Do not use R2 as a PDF cache: enabling R2 requires an R2 subscription checkout flow and payment method. Browser-native print-to-PDF is the supported default; PDF generation must continue to work without Browser Run, R2, Vercel Blob or any other object-storage product.
DOCX is generated client-side from `ResumeDoc` using a deterministic document library. Use semantic Word styles, paragraphs and bullet lists; avoid tables, text boxes and text-as-images in ATS-safe exports. Plain text is generated by a deterministic serializer, not an LLM.

### 7.9 Storage policy

- Neon PostgreSQL stores structured records and small text payloads. Do not store original resume/JD files in the database.
- No object-storage service is part of v1. R2 is explicitly excluded because enabling it requires checkout/payment-method setup, even though it advertises a free usage allowance. Vercel Blob and third-party upload services are also excluded unless their signup and activation are proven to require no payment card and to remain within a hard $0 limit.
- Raw uploads are processed in the browser and discarded after extraction. Do not retain originals by default.
- Generated PDF/DOCX/TXT files are streamed/downloaded directly by the browser. No cloud export cache is required for correctness.
- Public resume pages and expiring share links render immutable, redacted snapshots stored as structured JSON in Neon. Store only a hash of the random share token; enforce expiry and revocation server-side.

### 7.10 Database access, query optimization and integration quality

Neon PostgreSQL is the single source of truth. Drizzle ORM is the only normal application data-access layer. Keep database access behind typed repository functions called by domain services; UI components must not construct SQL or call the database directly. Use one shared, well-tested database client module configured for Vercel serverless execution and Neon’s pooled connection endpoint. Prefer the Neon serverless HTTP driver for independent, stateless queries; use a pooled connection/transaction-capable driver only where a real multi-statement transaction is required. Do not create a new unbounded connection pool per request or hold connections open across user think-time.

**Query performance is a release requirement, not a later optimization.** For every list/detail/dashboard/editor query:

- Select only the columns needed by that screen or operation. Never fetch entire rows or large JSON snapshots when the caller needs only IDs, titles or timestamps.
- Eliminate N+1 queries. Fetch related data with a bounded join, a small number of batched `IN` queries, or a deliberate aggregate query. Do not issue one query per entry, bullet, source, version or application inside a loop.
- Apply tenant ownership (`user_id`) and soft-delete predicates in the SQL `WHERE` clause, not after fetching records. Include ownership in joins and update/delete predicates as well as reads.
- Use cursor/keyset pagination for all unbounded collections, with a deterministic composite order such as `(updated_at DESC, id DESC)`. Avoid offset pagination for growing tables except small, bounded admin-only views.
- Add composite indexes that match real filters and sort orders. Use partial indexes for frequently queried active rows where appropriate. Avoid duplicate or low-selectivity indexes that increase write cost.
- Use PostgreSQL full-text search (`tsvector` + GIN) for bank and bullet search; keep search results tenant-scoped and exclude soft-deleted rows. Use `EXPLAIN (ANALYZE, BUFFERS)` on representative seeded datasets before release. Verify index scans for common tenant-scoped paths, inspect estimated versus actual rows, and fix sequential scans on high-cardinality user-owned tables where an index should be used. Do not blindly force indexes.
- Use transactions for multi-row invariants: import acceptance, version finalization, application/version linking, share creation/revocation, account deletion and BYOK credential rotation. Keep transactions short and never include LLM/network calls inside a database transaction.
- Use optimistic concurrency (`row_version` or an explicit version column) for autosave and edits. Update with a conditional predicate and detect zero-row updates as conflicts; never silently overwrite another tab's newer data.
- Batch bulk inserts/updates with bounded chunk sizes. Avoid per-row writes in import and staging workflows. Use `INSERT ... ON CONFLICT` only where idempotency semantics are explicit.
- Use database-side aggregates for counts and dashboards instead of loading all rows into application memory. Cache only derived, non-sensitive data with explicit invalidation; never let a cache bypass tenant authorization or share-link expiry.
- Keep large immutable `ResumeDoc` JSONB snapshots out of frequently scanned list queries. Store them in version rows and load only when opening/exporting a specific version. Do not duplicate large JSON payloads in unrelated tables.
- Set statement and request timeouts appropriate to Vercel Hobby limits. Add bounded retries only for transient connection failures; do not retry constraint violations, validation errors or slow queries blindly.
- Use prepared/parameterized queries. Never interpolate user-controlled values into SQL. Inspect Drizzle-generated SQL for complex queries and use reviewed parameterized SQL where the ORM cannot express an efficient plan.
- Record query name, duration, row count and normalized error code in telemetry. Do not log SQL parameters, resume text, personal data, credentials or full query payloads.

**Required query budgets and acceptance tests:**

| Query class | Target at representative personal-MVP data volume | Required behavior |
|---|---:|---|
| Single-row read/update | p95 ≤ 100 ms database time | Uses primary/unique key plus tenant predicate; no table scan |
| Bank list page (25 rows) | p95 ≤ 150 ms database time | One bounded page query plus at most two batched related-data queries; no N+1 |
| Job/application dashboard | p95 ≤ 200 ms database time | Aggregates in SQL; bounded result set |
| Resume version load | p95 ≤ 150 ms database time | One version snapshot read plus only required metadata |
| Autosave | p95 ≤ 150 ms database time | One conditional update; conflict is explicit |
| Bulk import acceptance (≤100 staged items) | ≤ 5 bounded database round trips where practical | Transactional, batched, idempotent; no per-item query loop |

These are initial engineering targets measured in the database layer under a seeded dataset, excluding network RTT and cold starts. If a target is missed, capture the query plan and optimize before increasing compute or changing plans. Seed performance tests with at least 10,000 bank entries/bullets across multiple users, and ensure the tested user owns a realistic subset. Add automated tests that fail on known N+1 patterns and verify query counts for critical flows.

### 7.11 Secrets and personal data

Provider API keys are encrypted using authenticated encryption (AES-256-GCM) with a key-encryption key stored as a Vercel server-side environment secret. For optional Cloudflare Worker code, use a separate Worker secret; never expose either secret to the browser. Store a unique random nonce per encryption operation and persist the encryption version. Rotation procedure: deploy a new key version, decrypt/re-encrypt stored keys in bounded batches, verify, then retire the old key. Prefer not storing platform provider keys in the database at all; keep platform keys in Vercel server-side environment secrets. Do not store Clerk session tokens.

### 7.12 Free-tier and no-card safety controls

- Disable paid fallbacks and automatic upgrades.
- Keep Vercel on Hobby and Neon on Free; do not add a payment method or enable paid usage. Separately enforce internal daily budgets. A dashboard alert is not a hard spending cap.
- For products with no hard account-level spending cap, avoid enabling paid usage or billing-backed features. If a provider requires billing details, treat it as ineligible for the zero-cost default.
- Maintain per-provider daily request/token budgets and stop calls before reaching provider limits.
- No Browser Run calls are made in the v1 default architecture. Browser print remains available without external rendering services.
- Display quota status and reset time where available. On quota exhaustion, queue no surprise retries and preserve all drafts.

## 8. Canonical data model and resume representation

### 8.1 Modeling rules

1. A Data Bank entry is a reusable career object (experience, project, education, certification, etc.).
2. An entry can contain many atomic achievement bullets.
3. A bullet belongs to exactly one canonical entry. If the same achievement applies to multiple entries, create explicit links through `bullet_relations` rather than duplicate its canonical content.
4. A bullet can be reused in any number of resume versions. Resume versions store immutable snapshots of selected content and overrides, so later bank edits do not change old resumes.
5. Facts and metrics are structured, typed and source-attributed. A metric is not inferred by the AI.
6. Conflicts are never silently merged. The user resolves them or preserves both values with provenance and effective dates.
7. `visibility` controls eligibility for inclusion and sharing; private facts are excluded from public snapshots unless explicitly selected.

### 8.2 Core entities

| Entity | Purpose | Key relationships |
|---|---|---|
| `users` | App-local user record keyed to Clerk subject | One-to-many with all owned records |
| `bank_entries` | Experience, project, education, skill group, etc. | One-to-many bullets, sources and facts |
| `achievement_bullets` | Atomic achievement claims | Belongs to one entry; many-to-many resume usage |
| `bullet_facts` | Typed metrics, tools, scope and evidence | Belongs to bullet or entry |
| `bullet_relations` | Explicit reuse/related-claim links | Bullet-to-bullet relationship |
| `sources` | Import origin and provenance | One-to-many imported records |
| `source_evidence` | Original snippet/page/field supporting a record | Linked to source and target record |
| `import_batches` | Staged import workflow | One-to-many staged items |
| `staged_items` | Parsed but unaccepted candidates | Accepted item points to bank record |
| `jobs` | JD/company/role record | One-to-many resume versions and applications |
| `jd_analyses` | Versioned structured JD analysis | Belongs to job |
| `resume_documents` | Base or job-specific resume container | One-to-many immutable versions |
| `resume_versions` | Immutable content snapshots | Belongs to resume document |
| `resume_version_items` | Snapshot sections, entries and bullets | References source IDs plus copied content |
| `applications` | Application tracker record | References job and selected resume version |
| `cover_letters` | Cover letter documents and snapshots | Linked to job/application |
| `ai_runs` | Provider/model/prompt/validator telemetry | Linked to user and optional job/version |
| `provider_credentials` | Encrypted BYOK credentials | Belongs to user/provider |
| `share_links` | Revocable, expiring immutable shares | References published snapshot |
| `audit_events` | Sensitive-action audit trail | Belongs to user |
| `background_jobs` | Resumable task state | Belongs to user |

### 8.3 Field definitions

**`bank_entries`**
- `id` UUID/ULID primary key; `user_id` required; `entry_type` enum; `title`; `organization`; `location`; `start_date`; `end_date`; `is_current`; `description_context`; `sort_order`; `visibility` (`private`, `resume`, `public_eligible`); `verification_status` (`unverified`, `user_verified`, `source_verified`); `created_at`; `updated_at`; `deleted_at`; `row_version`.
- `entry_type` values: `profile`, `experience`, `education`, `project`, `skill_group`, `certification`, `award`, `publication`, `volunteer`, `custom`.

**`achievement_bullets`**
- `id`; `user_id`; `entry_id`; `text`; `normalized_text`; `sort_order`; `importance`; `visibility`; `verification_status`; `source_id`; `created_at`; `updated_at`; `deleted_at`; `row_version`.
- `importance` is user-defined and must not be treated as factual evidence.

**`bullet_facts`**
- `id`; `user_id`; `bullet_id` nullable; `entry_id` nullable; `fact_type` (`metric`, `tool`, `technology`, `scope`, `role`, `outcome`, `date`, `other`); `key`; `value_text`; `value_number` nullable; `unit`; `currency_code` nullable; `metric_kind`; `source_evidence_id`; `verification_status`; `created_at`.
- Exactly one of `bullet_id` or `entry_id` must be set. Metrics use `{ value, unit, label, kind, precision?, currency_code?, period? }`. Preserve exact numeric value and unit; display formatting may change but underlying value cannot.

**`sources` / `source_evidence`**
- Source fields: `id`, `user_id`, `source_type` (`manual`, `resume_upload`, `linkedin_export`, `linkedin_text`, `linkedin_oauth`, `github`, `free_text`, `user_edit`, `ai_generated`), `source_label`, `source_url`, `source_hash`, `imported_at`, `parser_version`, `retention_policy`.
- Evidence fields: `id`, `source_id`, `user_id`, `source_locator` (page, section, CSV filename/row, GitHub repo/field), `snippet`, `content_hash`, `confidence`, `created_at`.
- Store only the minimum evidence snippet required for auditability. Do not retain full original uploads by default.

**`resume_versions`**
- `id`, `user_id`, `resume_document_id`, `job_id` nullable, `parent_version_id` nullable, `version_number`, `version_kind` (`base`, `working`, `ai_revision`, `user_revision`, `final`, `published_snapshot`), `status`, `resume_doc_json`, `content_hash`, `template_id`, `template_version`, `theme_json`, `page_size`, `target_pages`, `created_by`, `created_at`, `finalized_at`, `immutable_at`.
- Finalized and published snapshots are immutable. Editing creates a child version.
- `resume_doc_json` includes copied content and provenance metadata. It must not rely on live joins to render historical versions.

### 8.4 Reuse and relationship rules

- One project can have many achievement bullets.
- One canonical bullet belongs to one canonical entry to keep ownership and provenance unambiguous.
- A bullet may be referenced by multiple resumes and versions.
- If a bullet is relevant to more than one entry, create a `bullet_relations` record with relation type `supports`, `related_to` or `derived_from`; do not silently attach it to multiple parents.
- Duplicate detection proposes a merge. It never merges automatically.
- If two sources disagree on a date or metric, show both with their sources and ask the user to resolve. Keep a conflict record until resolved.
- A user can set a bullet to `never_use`, `private`, or `exclude_from_job` for a specific job. These exclusions are enforced before AI context construction.

### 8.5 Provenance and verification

Every fact that can reach a resume must have a provenance chain: bank record → source evidence → import/manual event. AI-generated text has a separate generated provenance record listing the source bullet IDs and prompt/model run. Manual edits are attributed to the user. The UI displays provenance on demand and highlights unverified imported facts. `user_verified` means the user confirmed it; it does not mean independently audited.

### 8.6 Conflict handling

- Never pick the newest or most complete value automatically when two facts conflict.
- Dates may be stored as month precision or year precision when exact day is unknown. Do not invent day values.
- Metrics retain original precision and units. Unit conversion requires an explicit deterministic conversion with both original and display values retained.
- A resolved conflict records the chosen value, rejected alternatives, resolver and timestamp.

### 8.7 Canonical `ResumeDoc`

The editor, templates, preview, PDF, DOCX, TXT, ATS checks and share snapshots all consume the same versioned `ResumeDoc` schema. Suggested top-level shape:

```ts
type ResumeDoc = {
  schemaVersion: 1;
  documentId: string;
  versionId: string;
  jobId?: string;
  profile: { name: string; headline?: string; email?: string; phone?: string; location?: string; links: Array<{ label: string; url: string }> };
  sections: Array<{
    id: string;
    type: string;
    heading: string;
    visible: boolean;
    items: Array<{
      id: string;
      sourceEntryId?: string;
      sourceBulletIds: string[];
      title?: string;
      organization?: string;
      dates?: { start?: string; end?: string; current?: boolean };
      location?: string;
      bullets: Array<{
        id: string;
        text: string;
        provenance: "bank" | "ai-rewrite" | "manual";
        sourceBulletIds: string[];
        sourceFactIds: string[];
        validatorStatus: "passed" | "not_applicable" | "rejected";
        pinned?: boolean;
      }>;
    }>;
  }>;
  template: { id: string; version: string; theme: Record<string, unknown> };
  page: { size: "A4" | "LETTER"; targetPages: number };
  metadata: { createdAt: string; jdHash?: string; promptVersion?: string };
};
```

Validate `ResumeDoc` with Zod at every import/API boundary. Keep migrations for schema changes and provide a deterministic migration path for saved documents.

## 8.8 Integration quality and end-to-end consistency

All application layers must integrate through stable, typed contracts. Use one canonical `ResumeDoc` schema package shared by the editor, server validation, scoring, export and sharing code. Keep database schema types, Zod validation schemas and API request/response types aligned; generate or infer types from a single source where practical rather than maintaining handwritten duplicates. Version API routes and persisted JSON documents. Validate at every trust boundary and return stable error shapes.

Use a single Clerk-to-app-user mapping and a single server-side authorization path. All user-owned reads and writes must pass through the same tenant-scoped repository helpers. Do not duplicate auth or ownership checks across individual UI components. Keep all internal API calls same-origin where possible to avoid CORS and cookie inconsistencies. If an optional Cloudflare Worker is introduced, authenticate requests with a short-lived signed service token, validate its audience and expiry, and pass only the minimum required payload; never forward Clerk cookies or provider credentials to it.

Use consistent UTC timestamps, normalized enums, stable IDs, idempotency keys and error codes across services. A user action must have one clear owner for its state transition: for example, the server commits a finalized resume version once, and the client reflects the returned canonical version. Avoid dual writes across Neon and another database. Do not make correctness depend on caches, edge KV or object storage.

Required end-to-end integration tests cover sign-in → create bank entry → ingest JD → analyze → tailor → validate provenance → edit → autosave → finalize immutable version → export PDF/DOCX/TXT → publish/revoke expiring share → export account data → delete account. Include refresh, retry, duplicate submission, two-tab conflict, quota exhaustion and partial provider failure scenarios. The complete core flow must pass with Cloudflare Workers, R2, Browser Run and all object storage disabled.

## 9. API contracts and application behavior

### 9.1 API conventions

- Base path: `/api/v1`.
- JSON requests/responses except binary export endpoints.
- Every authenticated request requires a valid Clerk session token.
- Derive `user_id` from the verified Clerk subject. Never accept a user ID from request body as authorization input.
- Validate inputs and outputs with Zod. Return stable error codes, not raw provider messages.
- Use cursor pagination for lists. Default page size 25, maximum 100.
- Mutating requests accept an `Idempotency-Key` where duplicate execution could create duplicate imports, AI runs, versions or share links.
- Use `If-Match` or `row_version` for optimistic concurrency.

### 9.2 Endpoint inventory

| Method | Endpoint | Purpose |
|---|---|---|
| GET/POST | `/me` | Read/create app-local profile |
| GET/PATCH | `/settings` | User preferences and privacy settings |
| GET/POST | `/bank/entries` | List/create bank entries |
| GET/PATCH/DELETE | `/bank/entries/:id` | Read/update/soft-delete entry |
| POST | `/bank/entries/bulk` | Bulk operations |
| GET/POST | `/bank/entries/:id/bullets` | List/create bullets |
| PATCH/DELETE | `/bank/bullets/:id` | Update/soft-delete bullet |
| POST | `/imports` | Create import batch |
| POST | `/imports/:id/parse` | Parse staged payload |
| GET | `/imports/:id` | Read staging results |
| POST | `/imports/:id/commit` | Accept selected staged items |
| POST | `/imports/:id/reject` | Reject staged items |
| GET/POST | `/jobs` | List/create job records |
| GET/PATCH/DELETE | `/jobs/:id` | Read/update/delete job |
| POST | `/jobs/:id/analyze` | Analyze normalized JD |
| POST | `/jobs/:id/tailor` | Create AI tailoring run |
| GET | `/ai-runs/:id` | Poll run state/result |
| POST | `/ai-runs/:id/accept` | Accept selected validated changes |
| POST | `/ai-runs/:id/reject` | Reject changes |
| GET/POST | `/resumes` | List/create resume documents |
| GET/POST | `/resumes/:id/versions` | List/create versions |
| GET/PATCH | `/resume-versions/:id` | Read/update working version |
| POST | `/resume-versions/:id/finalize` | Finalize immutable snapshot |
| POST | `/resume-versions/:id/restore` | Create new version from old snapshot |
| POST | `/resume-versions/:id/share` | Create share snapshot/link |
| GET/POST | `/applications` | List/create tracker records |
| GET/PATCH/DELETE | `/applications/:id` | Read/update/delete tracker record |
| GET/POST | `/cover-letters` | List/create cover letters |
| GET/POST | `/provider-credentials` | Manage BYOK credentials |
| POST | `/provider-credentials/:id/test` | Test provider key |
| GET/POST | `/shares` | List/create share links |
| DELETE | `/shares/:id` | Revoke share link |
| GET | `/public/u/:username` | Public profile snapshot, only if published |
| GET | `/public/s/:token` | Resolve expiring share link |
| GET | `/export/account.json` | Export all user data |
| DELETE | `/account` | Request account deletion |

### 9.3 Standard error response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request could not be processed.",
    "fieldErrors": { "title": ["Required"] },
    "requestId": "opaque-request-id",
    "retryable": false
  }
}
```

Error codes include `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `CONFLICT`, `RATE_LIMITED`, `QUOTA_EXCEEDED`, `PROVIDER_UNAVAILABLE`, `UNSUPPORTED_FILE`, `URL_FETCH_BLOCKED`, `JOB_FAILED`, `VERSION_IMMUTABLE`, `SHARE_EXPIRED` and `INTERNAL_ERROR`.

### 9.4 Authentication and tenant isolation

- Verify Clerk JWT signature, issuer, audience, expiry and authorized party according to Clerk's current server-side guidance.
- Map the verified Clerk subject to exactly one app-local `users` row.
- All service methods receive a trusted `userId` from middleware, not from client input.
- Every PostgreSQL query touching user-owned data includes `user_id = ?` in the query predicate. Use composite unique keys and foreign keys that include ownership where practical.
- Public share endpoints are a separate, narrowly scoped path: the token resolves only to a published immutable snapshot and never grants access to the user's bank or account.
- Test cross-tenant access with two independent test users for every resource type.

## 10. Relevance, AI validation and match scoring

### 10.1 Pipeline

1. Normalize JD text and calculate content hash.
2. Parse JD into structured requirements (Appendix A).
3. User reviews and edits extracted keywords and priorities.
4. Apply user exclusions and visibility rules to Data Bank candidates.
5. Retrieve candidates using deterministic keyword/tag/title matching. Use embeddings only as a supplementary pre-filter.
6. Score candidate bullets for relevance and select within the page budget.
7. Generate rewrites in structured output with source IDs and claim-level evidence mapping.
8. Run deterministic validation and semantic review checks.
9. Reject unsupported output; retry at most once with validator feedback.
10. Present accepted candidates with before/after diff and provenance; user approves before content is committed.

### 10.2 Bullet relevance score

Initial tunable score, 0–100:

| Signal | Weight | Meaning |
|---|---:|---|
| Must-have skill/keyword evidence | 30 | Directly evidenced match to a must-have |
| Responsibility similarity | 20 | Similarity between JD responsibility and source bullet |
| Achievement/outcome relevance | 15 | Evidence that the bullet demonstrates the role's outcomes |
| Domain/context match | 10 | Relevant industry, product or problem context |
| Recency | 10 | More recent relevant experience, with capped decay |
| Role/seniority alignment | 10 | Scope and responsibility level supported by source |
| User importance | 5 | User-selected priority |

Rules: user exclusions override all scores; an unverified keyword cannot be treated as evidence; a missing metric does not automatically make a bullet irrelevant; recency must not erase highly relevant older achievements. Store the score breakdown for explainability. Embedding similarity alone can never establish factual evidence.

### 10.3 Retrieval and token budget

- Use deterministic lexical retrieval as the baseline. Normalize case, punctuation, common aliases and user-approved synonyms.
- Embeddings can shortlist candidates, but final selection must inspect the source text and structured facts.
- Initial target context budget: ≤7,000 input tokens per rewrite operation, configurable by provider. This is an engineering target, not a correctness limit.
- Include only selected JD requirements, candidate bullets, related entry context and relevant structured facts. Exclude private items, `never_use` items and unrelated personal data.
- If context exceeds budget, rank and batch bullets. Never truncate a source bullet or fact silently.

### 10.4 Truth-bound rewrite validator

**Core rule:** every factual claim in generated text must be entailed by the source records explicitly supplied to the model. Keyword overlap is not evidence of entailment.

Required output from the model:

```ts
type RewrittenBullet = {
  text: string;
  sourceBulletIds: string[];
  sourceFactIds: string[];
  claimMap: Array<{
    claim: string;
    evidenceIds: string[];
    claimType: "action" | "tool" | "metric" | "scope" | "outcome" | "date" | "other";
  }>;
};
```

Validation layers:

1. **Schema validation:** all source IDs must exist, belong to the current user and be in the supplied candidate set.
2. **Numeric validation:** every number, percentage, date, duration, currency and unit must match a supplied structured fact or source text. No rounding or conversion unless a deterministic rule explicitly preserves the original value.
3. **Entity/tool validation:** employers, job titles, products, technologies, certifications, team sizes and named entities must be present in evidence.
4. **Scope/outcome validation:** terms such as `enterprise`, `production-scale`, `global`, `high-availability`, `secure`, `scalable`, `led`, `owned`, `architected`, `optimized` and `increased` require explicit supporting evidence. These terms are not allowed merely because they appear in the JD.
5. **Claim coverage:** every sentence/clause must map to evidence. Unsupported clauses cause rejection of the entire rewritten bullet, not a cosmetic warning.
6. **Semantic entailment check:** run a separate verifier against each claim and its cited evidence. If uncertain, reject and use the original bullet. The verifier is a second model or deterministic rule set and is not treated as proof; conservative fallback is mandatory.
7. **Context rule:** free-form context can clarify a source achievement, but cannot be used to invent measurable outcomes, scale, ownership or impact not stated in that context.
8. **Skill rule:** skills not in the bank appear only in a separate suggestion panel labelled `Not in your Data Bank — add only if true`. They are not included in the resume until the user confirms and adds them to the bank.
9. **Retry rule:** one repair attempt maximum. If validation still fails, retain the original bullet and record the rejection reason.
10. **Manual edit rule:** user-authored text is labelled `manual`; the app does not claim it is AI-verified. The user remains responsible for its truth.

The validator must reject the example rewrite `Developed scalable enterprise-grade applications` when the only evidence is `Developed a dashboard using React and Flask.` No `scalable` or `enterprise-grade` claim is supported.

### 10.5 Resume–JD Match Score

Use the label **Resume–JD Match Score**, not `ATS score`, unless the UI clearly states that it is an estimate and not an employer ATS result. Display the score as an internal compatibility estimate, not a prediction of interview probability or ATS acceptance.

Initial scoring weights:

| Dimension | Weight |
|---|---:|
| Must-have keyword/evidence coverage | 30 |
| Nice-to-have keyword/evidence coverage | 10 |
| Relevant achievement coverage | 20 |
| Responsibility alignment | 15 |
| Experience/seniority alignment | 10 |
| Skills evidence and recency | 5 |
| Parseability and formatting | 10 |
| **Total** | **100** |

Scoring rules:
- Count a keyword as covered only if it appears in the resume and has a supporting bank record, or is an explicitly user-confirmed skill.
- Synonyms map to a canonical concept but are not double-counted.
- Repeated keyword occurrences do not increase the score after first meaningful coverage.
- A keyword stuffed into an unrelated bullet does not count.
- Parseability checks are deterministic and reported separately from content match.
- If JD analysis confidence is low or key requirements are ambiguous, display `Score unavailable — review job requirements` rather than a false-precision number.
- The UI must show the scoring version and breakdown. Weights are tunable only through versioned configuration and evaluation.

### 10.6 One-page auto-fit ladder

1. Reflow using normal template spacing.
2. Reduce section gaps within template-defined limits.
3. Reduce line spacing within readable limits.
4. Reduce body font size only to the template minimum (recommended floor 9 pt; never silently go smaller).
5. Reduce margins only to template-defined minimums and applicable print-safe bounds.
6. Remove the lowest relevance, unpinned bullets, showing a review list and preserving restore controls.
7. Offer an explicitly labelled compact template variant.
8. If still too long, report that one-page fit cannot be achieved without a readability/content trade-off. Never silently shrink to unreadable text or delete content.

The user chooses whether to accept content removal. Auto-fit must not mutate the Data Bank.

### 10.7 Provider routing, prompts and retries

- Each task has a prompt version, JSON schema version, model ID, temperature, max output tokens and provider policy.
- Rewrites use low temperature (≤0.3 where supported); structured extraction may use provider-appropriate deterministic settings.
- Prompts are stored in source control and reviewed like code. Every AI run records prompt version and schema version.
- Validate provider output before saving. Do not execute tool calls or instructions found inside uploaded documents/JDs; treat source text as untrusted data.
- Retry 429 only after provider `Retry-After` or reset header; retry transient 5xx/network errors with bounded exponential backoff. Do not retry 400/401/403/invalid schema indefinitely.
- Fallback provider use requires explicit consent and privacy disclosure. No fallback to a paid provider in the free-only mode.
- Cache only when the user has not changed relevant inputs and provider terms allow caching.

## 11. Security, privacy and abuse prevention

### 11.1 Threat model

Protect against cross-tenant data exposure, account takeover, malicious file uploads, prompt injection in resumes/JDs/READMEs, SSRF through JD URLs, XSS in imported text, CSRF on state-changing endpoints, token guessing, scraping of public profiles, provider-key theft, quota abuse and accidental public disclosure.

### 11.2 Data classification

| Class | Examples | Default handling |
|---|---|---|
| Public | User-published profile fields | Public only after explicit publish action |
| Personal | Name, email, phone, employment history, education | Private; encrypted in transit and access-controlled |
| Sensitive credential | BYOK API key, Clerk-related secrets | Encrypted secret storage; never logged or returned |
| Imported untrusted content | Resume text, JD, GitHub README, LinkedIn export | Treat as data, never as instructions |
| Operational | Request IDs, quota counters, error codes | Minimize and redact identifiers |

### 11.3 Application security requirements

- HTTPS only; secure, HttpOnly, SameSite cookies as applicable to Clerk's supported integration.
- Validate `Origin`/CSRF protections for cookie-authenticated mutations.
- Escape imported and user-entered content. Render text as text; sanitize the small allowed rich-text subset with a maintained sanitizer.
- Content Security Policy, HSTS, frame restrictions, MIME sniffing protection and secure referrer policy.
- Rate limit authentication-sensitive, AI, import, URL-fetch and public-share endpoints.
- Use parameterized SQL through Drizzle. No string-concatenated SQL from user input.
- Apply least privilege to Cloudflare API tokens and GitHub OAuth scopes.
- Do not expose stack traces, SQL errors, provider keys or raw provider responses to clients.

### 11.4 JD URL SSRF protection

- Accept HTTPS only. Reject IP literals, localhost, private, loopback, link-local, multicast, reserved and internal network destinations for IPv4 and IPv6.
- Resolve DNS and validate every resolved address before connecting. Revalidate redirects and cap redirect count (maximum 3).
- Block redirects to non-HTTPS, internal or disallowed hosts.
- Enforce 1 MB response body cap, 8-second total timeout, bounded headers and content-type allowlist.
- Do not forward cookies, Clerk tokens, authorization headers or internal metadata to the target host.
- Strip scripts and active content; extract text only.
- If the target blocks automation, requires login or returns a challenge, ask the user to paste the JD. Do not attempt to bypass access controls.

### 11.5 File safety

- Enforce the existing 10 MB / 10-page limits before parsing; verify MIME type using file signatures, not filename alone.
- Allow only PDF, DOCX, ZIP for the explicitly supported LinkedIn export and supported image types for JD screenshots.
- Reject encrypted/password-protected files unless a safe local password flow is implemented; reject malformed archives, zip bombs, path traversal entries and excessive decompression ratios.
- Parse in a sandboxed browser context; do not execute macros, scripts, embedded objects or external links.
- Do not retain raw uploads by default. Clear temporary object URLs and in-memory buffers when processing completes or fails.

### 11.6 Public profile and expiring links

- Private by default. Publishing requires an explicit confirmation screen showing exactly which fields will become public.
- Public profile (`/u/:username`) and share link (`/s/:token`) have separate toggles, scopes, expiry and revocation controls.
- Share links use at least 128 bits of cryptographically secure random entropy; store only a hash of the token. Tokens are bearer secrets and must not be logged.
- Expiry is enforced server-side on every request. Revocation takes effect immediately (subject to cache purge). Default expiry for generated links: 7 days; user may select shorter/longer bounded options.
- Snapshot is immutable. Updating a resume does not update an existing share; user must publish a new snapshot.
- Redaction is applied to a copy before snapshot creation. Do not rely on CSS hiding to protect data.
- Public profile is `noindex` by default, has no directory/listing endpoint, and uses anti-enumeration rate limits. Do not expose sequential IDs.
- User can revoke public profile publication and all active links from one control panel.

### 11.7 Retention, deletion and audit

- Raw files are not retained by default. JD text and Data Bank content remain until the user deletes them.
- Account deletion immediately disables authentication and public shares, then queues deletion of PostgreSQL rows and provider credentials. No object-storage deletion is required in v1. Complete within 30 days; display status and provide a deletion confirmation.
- Audit events cover publish/unpublish, share creation/revocation, BYOK create/rotate/delete, account export and deletion. Avoid logging document contents.
- User data export includes structured records, versions, application history, settings and provenance metadata. It excludes secrets and active session tokens.
- Provide a privacy notice identifying each provider, data sent, purpose, retention and whether provider terms allow training/use of submitted data.

## 12. Reliability, observability and operational requirements

### 12.1 Reliability

- Autosave is debounced but must also save on blur/navigation when possible. Show `Saving`, `Saved`, `Offline` and `Save failed` states.
- IndexedDB draft is the recovery source if network save fails. On reconnect, compare `row_version`; never silently overwrite newer server state.
- Conflict resolution offers compare/merge or save as a new version. No last-write-wins for conflicting resume edits.
- All mutating workflows use idempotency keys and transaction boundaries where possible.
- AI runs persist partial stage state and never discard a successfully parsed JD or selected bullets because a later provider call failed.
- Export failure must not affect the saved resume version.

### 12.2 Observability

Capture structured events: request ID, route, status, latency, user-scoped pseudonymous ID, build SHA, schema version, provider/model, prompt version, token usage, quota state, validation outcome and error code. Do not log resume text, JD text, email, phone, API keys or raw prompts containing personal data.

Dashboards should include:
- Vercel function invocations, duration, errors and quota use; optional Cloudflare Worker requests/CPU only if deployed.
- Neon storage, compute usage, connection errors, slow queries and query latency.
- No object-storage usage is expected in v1; alert if an object-storage dependency appears in the deployment.
- AI requests, tokens, 429s, failures, validation rejection rate and fallback usage.
- Import parsing failures by file type.
- PDF/DOCX export failures and text parity.
- Autosave conflict and recovery counts.

### 12.3 Graceful degradation

| Failure | Expected behavior |
|---|---|
| AI provider unavailable | Keep JD and draft; allow manual selection/edit; retry later |
| AI quota exhausted | Stop provider calls; display reset time; no paid fallback |
| Embeddings unavailable | Use lexical matching |
| Optional rendering service unavailable | Use browser print-to-PDF; core export is unaffected |
| Object storage unavailable/not configured | No impact; exports still work |
| Neon quota/compute limit reached | Enter read-only/degraded state where possible; preserve local draft; explain reset/next step |
| GitHub API rate-limited | Save import state and retry after reset; no duplicate entries |
| JD URL blocked | Ask user to paste JD text |
| DOCX generation fails | Preserve ResumeDoc and offer PDF/TXT path |

## 13. Evaluation and testing strategy

### 13.1 Test layers

- Unit tests: Zod schemas, data normalization, scoring, metric comparisons, version hashing, access policy, token generation and serializers.
- Integration tests: Vercel Route Handlers with Neon PostgreSQL test database, Clerk JWT verification, provider adapters mocked at contract level, PostgreSQL ownership constraints, indexes, migrations and query plans.
- End-to-end tests: sign-in, create bank entry, import/stage/accept, paste JD, analyze, tailor, edit, autosave, finalize, export and share/revoke.
- Security tests: tenant isolation, SSRF, XSS, CSRF, token guessing, file parser abuse, ZIP traversal and secret leakage.
- Visual tests: template screenshots and page-break snapshots at supported browsers and page sizes.
- AI evaluation: fixed golden set with expected source facts, claim maps, forbidden inferences and score outcomes.

### 13.2 AI truthfulness golden set

Maintain at least 100 labelled source/JD/rewrite cases before public release, with categories:
- Numeric preservation and unit handling.
- Unsupported scale/adjectives (enterprise, global, scalable, production-grade).
- Ownership inflation (contributed → led/owned/architected).
- Tool/skill injection from JD.
- Conflicting metrics and dates.
- Context-only evidence.
- Multi-bullet synthesis.
- Negation and uncertainty.
- Acronym/synonym normalization.
- Prompt injection embedded in resume, JD or README.

Release gates:
- Zero unsupported metrics in accepted AI output on the golden set.
- Zero accepted unsupported employer/title/tool claims.
- At least 98% claim-evidence precision on the labelled set; uncertain claims must fail closed.
- False rejection rate measured and reviewed; do not relax factual rules solely to improve fluency.
- Every model/prompt change reruns the complete golden set.

### 13.3 Template and export tests

- ATS-safe templates are single-column, semantic, selectable text, standard headings and no tables/text boxes/icons used as text.
- PDF extraction text order must match `ResumeDoc` section and bullet order.
- PDF text parity target ≥99% after normalization, excluding expected whitespace/page-break differences.
- DOCX opens in supported Word-compatible viewers and preserves headings, dates, bullets and links.
- TXT output uses stable heading order, readable separators and no decorative characters.
- Test A4 and Letter, one-page and multi-page resumes, long URLs, long organization names, missing dates, Unicode and long bullets.

### 13.4 Acceptance criteria for core flow

A release is not complete until a user can:
1. Authenticate and create a profile.
2. Add experience/project/education and multiple achievement bullets manually.
3. Upload a PDF or DOCX, inspect staged entries, edit and accept them.
4. Paste a JD and review editable structured requirements.
5. Generate a tailored resume where every AI bullet links to source records.
6. Confirm that unsupported claims are rejected and original bullets are retained on failure.
7. Edit through both structured form and preview, undo/redo and recover from a simulated network interruption.
8. Export PDF, DOCX and TXT and verify text order.
9. Finalize a version, update the Data Bank and prove the old version remains unchanged.
10. Create and revoke an expiring share link and verify redactions server-side.
11. Export account data and complete account deletion in a test environment.

### 13.5 Performance targets

- Initial app shell: target LCP ≤2.5 s on a reasonable broadband connection.
- Common bank CRUD API: p95 ≤500 ms excluding network/provider latency.
- Deterministic score recalculation: ≤200 ms for a typical resume.
- Autosave acknowledgement: p95 ≤1 s under normal conditions.
- JD analysis and AI rewrite are asynchronous where needed; show progress and do not promise a fixed completion time.
- All targets are measured in production-like preview, not inferred from local development.

## 14. Implementation plan and release gates

| Milestone | Deliverables | Exit gate |
|---|---|---|
| M0: Feasibility spikes | Next.js deployment spike; Clerk + Neon auth/data-access spike; Browser-native PDF print test; no server-side browser dependency; provider free-tier/privacy review | Architecture decisions recorded; no hidden paid dependency |
| M1: Foundation | Auth, tenant-safe Neon PostgreSQL schema, Drizzle migrations, Data Bank CRUD, source/provenance, JSON export | Cross-tenant tests pass; migrations and deletion tested |
| M2: Intake and JD | PDF/DOCX parsing, paste text, LinkedIn export parser, GitHub import, staging, JD paste/URL/PDF/image | All imports staged; SSRF and file tests pass |
| M3: Tailoring | JD schema, keyword editing, retrieval, rewrite, claim map, validator, diff and provenance | Golden set gates pass |
| M4: Editor and export | Form + preview editor, autosave/recovery, templates, auto-fit, PDF/DOCX/TXT | PDF parity and DOCX tests pass |
| M5: Job management | Match score/gap report, versions, tracker, cover letters | Score evaluation reviewed; immutable snapshots pass |
| M6: Sharing and multi-user readiness | Public profile, expiring links, redaction, BYOK, quotas, privacy/account deletion | Security review and public-share abuse tests pass |

**Recommended build order for fastest useful personal MVP:** M0 → M1 → paste-JD + one basic analysis path in M2 → M3 → M4. LinkedIn OAuth, themeable gallery, BYOK, cover letters and public profiles can follow. This changes delivery order, not the agreed product scope.

## 15. Open questions and decisions

### 15.1 Decisions adopted for v1.0

The following recommendations are adopted as defaults so the document can be implemented without blocking on minor choices. They can be changed by the owner before implementation.

| ID | Decision | Default |
|---|---|---|
| OQ-01 | Product name | `Resume Maker` remains a working title; final brand name deferred |
| OQ-02 | Page size | A4 default; Letter selectable |
| OQ-03 | Authentication methods | Clerk email code/link and Google sign-in; no phone OTP in v1 |
| OQ-04 | Language | English-only in v1 |
| OQ-05 | Public profile indexing | `noindex` by default; user opt-in indexing is deferred |
| OQ-06 | Expiring share default | 7 days; user can choose from bounded presets; revocable anytime |
| OQ-07 | Cover letter tone | Professional default; configurable concise, formal or conversational tone |
| OQ-08 | Raw upload retention | Do not retain original files by default |
| OQ-09 | AI changes | Require explicit user approval before committing to resume version |
| OQ-10 | Finalized history | Immutable snapshots; later bank changes never mutate historical versions |
| OQ-11 | Metrics | Structured and optional where unavailable; never invent or force a metric |
| OQ-12 | Sharing | Private by default; publish only after explicit confirmation |
| OQ-13 | Signup | Environment-configured allowlist during personal phase |
| OQ-14 | Free-tier guarantee | No paid fallback, no auto-upgrade, no usage beyond verified free allowance |
| OQ-15 | PDF default | Browser-native print-to-PDF; no server-side renderer or object storage |

### 15.2 Blocking technical spikes

| ID | Spike | Required proof |
|---|---|---|
| S-1 | Vercel + Neon deployment | Verify Next.js deployment, Clerk callbacks, Neon connectivity, pooled connection behavior and environment separation |
| S-2 | Clerk + Vercel server auth | Verify session/JWT validation, session refresh and local development flow |
| S-3 | PDF output | Preview/PDF parity in Chromium and at least one non-Chromium browser using browser-native print-to-PDF |
| S-4 | AI provider | Verify free-tier model availability, structured output, data-use terms, rate limits and no-billing configuration |
| S-5 | Browser parsing | PDF/DOCX extraction accuracy and memory behavior within 10 MB/10-page limits |
| S-6 | Neon capacity and query performance | Simulate expected personal use; validate compute, storage, connection pooling, index use and query plans |
| S-7 | No-card deployment verification | Complete Vercel, Neon, Clerk and optional Cloudflare Worker signup/activation without a payment card; confirm no paid trial, payment method or automatic billing is enabled |

### 15.3 Questions intentionally deferred

- Final product name and domain.
- Whether to allow public search indexing in a later release.
- Whether original files can be retained as an explicit opt-in feature.
- Whether user-created custom sections need arbitrary field schemas or a constrained set of fields.
- Whether multiple base resume profiles are needed (e.g. software, product, research).
- Whether to support languages other than English.
- Whether to introduce billing or paid plans if the product is opened to others. This is outside the current $0/month constraint.

## Appendix A. JD analysis schema

```ts
const JDAnalysisSchema = z.object({
  schemaVersion: z.literal(1),
  role: z.object({
    title: z.string().nullable(),
    company: z.string().nullable(),
    seniority: z.enum(["intern", "entry", "junior", "mid", "senior", "lead", "manager", "director", "executive", "unknown"]),
    domain: z.array(z.string()),
    location: z.string().nullable(),
    workMode: z.enum(["onsite", "hybrid", "remote", "unknown"]),
    yearsExperience: z.object({ min: z.number().nullable(), max: z.number().nullable() }),
    education: z.array(z.string()),
  }),
  keywords: z.array(z.object({
    id: z.string(),
    canonical: z.string(),
    synonyms: z.array(z.string()),
    category: z.enum(["technical_skill", "tool", "domain", "responsibility", "soft_skill", "credential", "other"]),
    priority: z.enum(["must_have", "nice_to_have"]),
    importance: z.number().min(0).max(1),
    evidencePhrase: z.string().nullable(),
    userOverride: z.enum(["none", "promoted", "demoted", "removed"]).default("none"),
  })),
  responsibilities: z.array(z.object({
    id: z.string(),
    text: z.string(),
    priority: z.enum(["must_have", "nice_to_have"]),
    keywords: z.array(z.string()),
  })),
  constraints: z.array(z.string()),
  ambiguityFlags: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  sourceTextHash: z.string(),
  promptVersion: z.string(),
});
```

The model must not infer requirements that are absent from the JD. Unknown fields remain `null`, empty or `unknown`; do not fill them from assumptions about the company or role.

## Appendix B. Core relational schema outline

The following is a PostgreSQL-oriented logical schema, not final Drizzle syntax. Use UUID primary keys (or consistently generated text IDs), `TIMESTAMPTZ` for instants, `DATE` for date-only values, `BOOLEAN` for flags, and `JSONB` for structured snapshots/settings. Every tenant-owned table must carry `user_id`. Add the workload-specific indexes listed after the table definitions; validate all indexes against actual query plans rather than adding redundant indexes blindly.

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  clerk_subject TEXT NOT NULL UNIQUE,
  username TEXT UNIQUE,
  display_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE bank_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  entry_type TEXT NOT NULL,
  title TEXT NOT NULL,
  organization TEXT,
  location TEXT,
  start_date DATE,
  end_date DATE,
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  description_context TEXT,
  visibility TEXT NOT NULL DEFAULT 'private',
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  sort_order INTEGER NOT NULL DEFAULT 0,
  row_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ,
  search_vector TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(organization, '') || ' ' || coalesce(description_context, ''))) STORED
);

CREATE TABLE achievement_bullets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  entry_id TEXT NOT NULL REFERENCES bank_entries(id),
  text TEXT NOT NULL,
  normalized_text TEXT,
  visibility TEXT NOT NULL DEFAULT 'private',
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  usage_policy TEXT NOT NULL DEFAULT 'eligible',
  sort_order INTEGER NOT NULL DEFAULT 0,
  row_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ,
  search_vector TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', coalesce(text, '') || ' ' || coalesce(normalized_text, ''))) STORED
);

CREATE TABLE bullet_facts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  bullet_id TEXT REFERENCES achievement_bullets(id),
  entry_id TEXT REFERENCES bank_entries(id),
  fact_type TEXT NOT NULL,
  fact_key TEXT NOT NULL,
  value_text TEXT NOT NULL,
  value_number DOUBLE PRECISION,
  unit TEXT,
  currency_code TEXT,
  metric_kind TEXT,
  source_evidence_id TEXT,
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  created_at TIMESTAMPTZ NOT NULL,
  CHECK ((bullet_id IS NOT NULL AND entry_id IS NULL) OR (bullet_id IS NULL AND entry_id IS NOT NULL))
);

CREATE TABLE sources (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  source_type TEXT NOT NULL,
  source_label TEXT,
  source_url TEXT,
  source_hash TEXT,
  parser_version TEXT,
  imported_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE source_evidence (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  source_id TEXT NOT NULL REFERENCES sources(id),
  source_locator TEXT,
  snippet TEXT,
  content_hash TEXT,
  confidence DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT,
  company TEXT,
  location TEXT,
  source_url TEXT,
  raw_text TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE resume_documents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  base_resume_id TEXT,
  job_id TEXT REFERENCES jobs(id),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE resume_versions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  resume_document_id TEXT NOT NULL REFERENCES resume_documents(id),
  parent_version_id TEXT REFERENCES resume_versions(id),
  version_number INTEGER NOT NULL,
  version_kind TEXT NOT NULL,
  resume_doc_json JSONB NOT NULL,
  content_hash TEXT NOT NULL,
  template_id TEXT NOT NULL,
  template_version TEXT NOT NULL,
  page_size TEXT NOT NULL DEFAULT 'A4',
  target_pages INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL,
  finalized_at TIMESTAMPTZ,
  immutable_at TIMESTAMPTZ,
  UNIQUE(user_id, resume_document_id, version_number)
);

CREATE TABLE applications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  job_id TEXT REFERENCES jobs(id),
  resume_version_id TEXT REFERENCES resume_versions(id),
  status TEXT NOT NULL,
  applied_at TIMESTAMPTZ,
  follow_up_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE share_links (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  resume_version_id TEXT NOT NULL REFERENCES resume_versions(id),
  token_hash TEXT NOT NULL UNIQUE,
  scope_json JSONB NOT NULL,
  redactions_json JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL
);


-- Tenant-scoped list and ordering paths. Confirm with EXPLAIN ANALYZE on seeded data.
CREATE INDEX bank_entries_user_type_updated_idx
  ON bank_entries (user_id, entry_type, updated_at DESC, id DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX bank_entries_user_updated_idx
  ON bank_entries (user_id, updated_at DESC, id DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX achievement_bullets_user_entry_sort_idx
  ON achievement_bullets (user_id, entry_id, sort_order, id)
  WHERE deleted_at IS NULL;
CREATE INDEX bank_entries_search_vector_idx
  ON bank_entries USING GIN (search_vector) WHERE deleted_at IS NULL;
CREATE INDEX achievement_bullets_search_vector_idx
  ON achievement_bullets USING GIN (search_vector) WHERE deleted_at IS NULL;
CREATE INDEX bullet_facts_user_bullet_idx
  ON bullet_facts (user_id, bullet_id) WHERE bullet_id IS NOT NULL;
CREATE INDEX bullet_facts_user_entry_idx
  ON bullet_facts (user_id, entry_id) WHERE entry_id IS NOT NULL;
CREATE INDEX jobs_user_created_idx
  ON jobs (user_id, created_at DESC, id DESC);
CREATE INDEX jobs_user_hash_idx
  ON jobs (user_id, content_hash);
CREATE INDEX resume_documents_user_updated_idx
  ON resume_documents (user_id, updated_at DESC, id DESC);
CREATE INDEX resume_versions_user_document_version_idx
  ON resume_versions (user_id, resume_document_id, version_number DESC);
CREATE INDEX applications_user_status_followup_idx
  ON applications (user_id, status, follow_up_at, id);
CREATE INDEX share_links_user_expiry_idx
  ON share_links (user_id, expires_at) WHERE revoked_at IS NULL;

```

Implementation note: PostgreSQL foreign-key enforcement and composite tenant constraints must be configured and tested. Use PostgreSQL-native types and syntax in the production Drizzle schema. Add composite ownership-aware foreign keys or enforce ownership in a single transaction in the service layer. The outline intentionally omits some supporting tables listed in Section 8.2; add them before enabling the corresponding feature. Add unique constraints for idempotency keys and per-user natural keys where the corresponding workflow requires them. Use `ON DELETE CASCADE` only where deletion semantics are unambiguous; immutable audit records and retention requirements may need explicit deletion workflows.

## Appendix C. Free-tier and no-payment-card feasibility

**Assessment date: 2026-11-18.** A free price does not prove that an account can activate the service without a payment card. The project constraint is stricter than $0/month: every mandatory service must be activatable without entering payment details, and the app must not rely on usage-based billing or a paid trial. Recheck the actual signup and activation flows before implementation. If a service requests a payment method, treat it as excluded until the owner explicitly changes this constraint.

| Service | Current plan/constraint | PRD decision |
|---|---|---|
| Vercel Hobby | $0; intended for personal/non-commercial projects. Published limits include 1M function invocations/month, 4 active CPU-hours/month and 100 GB-hours function duration; limits and fair-use rules apply. Paid Pro is $20/month. Official documentation describes the plan and limits but does not conclusively guarantee that every signup flow is card-free. | Primary Next.js host. Before committing, complete signup/deploy without entering a card. Do not start Pro trial or enable paid usage. Hobby is suitable only while this remains a personal/non-commercial project. |
| Neon Free | $0; current published documentation lists 100 projects, 100 CU-hours/project, 0.5 GB storage/project and 5 GB egress/project. Neon has stated the Free plan does not require a credit card. Usage beyond Free allowances must not be allowed to become billable. | Primary PostgreSQL database. Use Free only; verify the account's current limits and ensure no paid plan or payment method is enabled. |
| Clerk Hobby | $0; published free allowance includes 50,000 monthly retained users per application. Clerk explicitly states no credit card is required for the Free plan; feature restrictions apply. | Authentication provider. Use supported free auth methods. Implement the personal signup allowlist in application code; do not depend on paid Clerk allowlist features. |
| Cloudflare Workers Free | Published Free allowance includes 100,000 requests/day and 10 ms CPU/request. A paid Workers subscription is not required for the Free plan, but the account's activation/payment prompts must be checked. | Optional only. Use for isolated URL-fetch utility if the actual account can deploy it without payment-card activation. Core application must work without it. |
| Cloudflare D1 | Free relational database with published database/storage and daily row read/write limits. | Excluded. Neon is the selected relational database; do not maintain a second system of record. |
| Cloudflare R2 | Free monthly usage allowance exists, but enabling R2 requires adding an R2 subscription through a checkout flow; Cloudflare's billing documentation says a primary payment method is required to purchase Cloudflare products. | Explicitly excluded. No R2 bucket, PDF cache or retained upload path. |
| Cloudflare Browser Run | Free allowance is limited and account activation eligibility under the no-card rule has not been established. | Excluded from the required architecture. Browser-native PDF export is mandatory and sufficient. |
| Vercel Blob / UploadThing / Cloudinary | Additional storage products create unnecessary vendor activation, quota and retention dependencies. | Not used in v1. Reconsider only after no-card activation and $0 hard-limit behavior are verified. |
| AI providers | Free allowances and data-use terms vary by model, region and account; some providers require payment details for higher tiers. | Optional adapter only after testing actual no-card signup, quotas, privacy terms and hard-stop behavior. BYOK may still incur charges for the user and must be clearly labelled. |
| GitHub REST API | Unauthenticated requests have lower rate limits; authenticated requests have higher limits and secondary limits may apply. | Use narrow-scope user authorization where needed; cache responses and respect rate-limit headers. |

### Appendix C.1 Official sources

- Vercel Hobby plan and usage limits: https://vercel.com/docs/plans/hobby
- Vercel pricing: https://vercel.com/pricing
- Vercel Hobby use restrictions: https://vercel.com/legal/terms
- Neon plan limits: https://github.com/neondatabase/website/blob/main/content/docs/introduction/plans.md
- Neon Free plan and no-card statement: https://neon.com/blog/new-usage-based-pricing
- Clerk pricing and no-card Free plan: https://clerk.com/pricing
- Cloudflare Workers limits: https://developers.cloudflare.com/workers/platform/limits/
- Cloudflare D1 limits (reference only; Neon PostgreSQL is not selected): https://developers.cloudflare.com/d1/platform/limits/
- Cloudflare R2 get started / subscription checkout: https://developers.cloudflare.com/r2/get-started/
- Cloudflare billing profile / payment method: https://developers.cloudflare.com/billing/get-started/create-billing-profile/
- Cloudflare Browser Run pricing: https://developers.cloudflare.com/browser-run/pricing/
- Gemini API pricing: https://ai.google.dev/gemini-api/docs/pricing
- Gemini API billing tiers: https://ai.google.dev/gemini-api/docs/billing
- Groq rate limits: https://console.groq.com/docs/rate-limits
- Groq billing FAQ: https://console.groq.com/docs/billing-faqs
- GitHub REST API rate limits: https://docs.github.com/en/rest/using-the-rest-api

### Appendix C.2 Cost-control policy

The app's own cost target is $0/month. This is not a guarantee that external providers will always offer free usage. The application must never silently incur charges. Do not attach a payment method to a provider used by the default free path unless the account supports a hard spend cap or paid usage is disabled. Show a clear notice when a feature requires a user's own paid API account. BYOK means the user supplies credentials; it does not mean the API usage is free.

## Appendix D. Glossary

- **Data Bank:** canonical, reusable record of career facts and achievements.
- **Atomic bullet:** one independently reusable achievement statement.
- **Source evidence:** snippet or structured field that supports a bank fact.
- **Provenance:** trace from a displayed claim back to its source record and any AI transformation.
- **JD:** job description.
- **ResumeDoc:** canonical, versioned representation used by all editors and exports.
- **Resume–JD Match Score:** estimated compatibility measure; not an employer ATS score.
- **Immutable snapshot:** finalized content that cannot be changed in place.
- **BYOK:** bring your own API key.
- **Tenant isolation:** a user can access only records owned by that user, except deliberately published snapshots.

---

## v1.1 sign-off checklist

- [ ] Owner accepts the adopted defaults in Section 15.1.
- [ ] Architecture spikes S-1 through S-7 completed.
- [ ] Free-tier quotas rechecked against the actual Vercel Hobby, Neon Free, Clerk and AI provider accounts; verify no-card activation.
- [ ] Data model, migrations, indexes and representative query plans reviewed before feature implementation.
- [ ] Query budgets, no-N+1 checks and seeded-dataset performance tests pass.
- [ ] Security and privacy requirements reviewed before public sharing is enabled.
- [ ] AI golden-set gates pass before AI tailoring is released.
- [ ] PDF/DOCX/TXT parity and immutability tests pass before final export is released.
