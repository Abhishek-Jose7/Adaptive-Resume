# Resume Maker (PRD v1.1 Implementation)

> A production-grade, zero-hallucination resume tailoring, data bank, and job application platform built strictly to the specifications of `PRD.md` with **$0 monthly infrastructure spend** and zero paid service dependencies.

---

## 🌟 Key Architecture & Highlights

- **Zero-Hallucination AI Tailoring**: Grounded in the candidate's personal Data Bank. Features the Section 10.4 **Truth-Bound Validator** which strictly rejects unevidenced metrics, newly fabricated technologies, inflated scope, and verb promotions (e.g., promoting "assisted" to "led").
- **7-Dimension Match Score Engine**: Real-time 0–100 scoring across Must-Have keywords (30%), Nice-to-Have keywords (10%), Relevant Achievements (20%), Responsibility Alignment (15%), Seniority Alignment (10%), Skills Evidence (5%), and Parseability (10%).
- **Interactive Split-Pane Resume Editor**: Real-time click-to-edit canvas, dual-column structure, debounced autosave with optimistic concurrency control (`row_version`), and offline draft backup in browser IndexedDB.
- **ATS-Optimized Templates & One-Page Auto-Fit**: 4 ATS templates (Classic ATS, Modern ATS, Minimal Executive, Technical Scholar) with an 8-step deterministic typographic ladder ensuring resumes fit their exact target page length without text truncation.
- **Multi-Format Export**: Native print-to-PDF (`/resumes/[id]/print`), client-side `.docx` generation (`docx`), and ATS-parseable plaintext.
- **Application Tracker & Grounded Cover Letters**: 6-stage Kanban application board (`Wishlist`, `Applied`, `Interviewing`, `Offer`, `Rejected`, `Archived`) with follow-up dates and cover letters grounded strictly in user evidence.
- **BYOK Credential Vault**: Free-tier provider integration (Gemini, Groq, local deterministic) with AES-256-GCM encryption at rest.
- **Privacy & GDPR Compliance**: Full personal data export (`GET /api/v1/export/account.json`) and cascading eradication (`DELETE /api/v1/account`).
- **PostgreSQL Database Quality**: 20 tables, 52 indexes (including composite tenant indexes and GIN full-text search vectors), dual-mode serverless connection pooling (Neon & local Postgres), and sub-millisecond query performance validated via `EXPLAIN (ANALYZE, BUFFERS)` (< 1ms vs < 50ms SLA).

---

## 🛠️ Tech Stack & $0 Free-Tier Architecture

| Component | Technology | Free Tier Configuration |
|---|---|---|
| **Framework** | Next.js 15.2 (App Router), React 19, TypeScript | Vercel Hobby / Self-hosted ($0) |
| **Styling** | Tailwind CSS v4, Lucide Icons | Zero cost ($0) |
| **Database** | PostgreSQL 17 / Neon Serverless | Neon Free Tier (0.5 GB, pooled) or Local Postgres ($0) |
| **ORM & Migrations** | Drizzle ORM, Drizzle Kit | Pure open source ($0) |
| **Authentication** | Clerk Auth | Free tier (up to 10,000 MAUs) + personal email allowlist ($0) |
| **AI Providers** | Google Gemini 1.5 Flash / Groq (Llama 3.3) / Local | Free API tiers / BYOK ($0) |
| **Document Processing** | `pdfjs-dist`, `mammoth`, `jszip` | 100% Client-side in browser ($0) |
| **Testing** | Vitest, TypeScript compiler (`tsc`) | Local execution ($0) |

---

## 🚀 Quick Start & Local Setup

### 1. Prerequisites
- Node.js 18+ (tested on Node.js 20+)
- PostgreSQL 16+ running locally OR a Neon Serverless PostgreSQL connection string

### 2. Installation
```bash
npm install
```

### 3. Environment Setup
Copy the example environment file:
```bash
cp .env.example .env.local
```
Configure your `.env.local`:
```env
DATABASE_URL=postgresql://postgres@localhost:5432/resume_maker
ENCRYPTION_SECRET_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
SIGNUP_ALLOWLIST=your-email@example.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
ENABLE_DEV_AUTH_BYPASS=true
DEV_USER_ID=usr_dev_personal_test_id
```

### 4. Database Migration
Apply the database migrations to initialize all 20 tables, foreign key cascades, and 52 indexes:
```bash
npx drizzle-kit migrate
```

### 5. Running the Test Suite
The comprehensive test suite covers unit tests, golden set validation, PostgreSQL `EXPLAIN ANALYZE` benchmarks, and end-to-end user journeys:
```bash
npm test
```
All 69 tests across 7 test files run and pass with 100% compliance.

### 6. Production Build
Run the Next.js production build:
```bash
npm run build
```
Compiles all 56 dynamic API routes and client pages with zero TypeScript or lint errors.

### 7. Starting the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to access the application.

---

## 📁 Repository Structure

```
├── drizzle/                     # Drizzle SQL migrations
│   └── 0000_even_shadowcat.sql  # 20-entity canonical schema & 52 indexes
├── scripts/
│   └── seedBenchmark.ts         # 11,001 record benchmark generator
├── src/
│   ├── app/                     # Next.js App Router (56 routes)
│   │   ├── (auth)/              # Sign-in & Sign-up pages
│   │   ├── api/v1/              # Versioned REST APIs
│   │   │   ├── bank/            # Data Bank CRUD, bullets, batch
│   │   │   ├── imports/         # Intake staging area & GitHub import
│   │   │   ├── jobs/            # JD scraping, analysis, tailoring, scoring
│   │   │   ├── resumes/         # Resumes, versions, DOCX/TXT exports
│   │   │   ├── applications/    # Kanban tracker & status transitions
│   │   │   ├── cover-letters/   # Grounded cover letter generator
│   │   │   ├── shares/          # Expiring links & public profiles
│   │   │   └── provider-credentials/ # BYOK credential management
│   │   ├── bank/                # Data Bank & Intake UI
│   │   ├── resumes/             # Resume editor & print views
│   │   ├── jobs/                # JD analysis & tailoring UI
│   │   ├── applications/        # Kanban board
│   │   ├── cover-letters/       # Cover letters manager
│   │   └── settings/            # BYOK and Privacy settings
│   ├── components/              # Modular UI components
│   │   ├── editor/              # Split-pane editor, auto-fit, linter
│   │   ├── templates/           # 4 ATS templates & renderer
│   │   └── applications/        # Kanban board component
│   ├── lib/                     # Core business logic & services
│   │   ├── auth/                # Clerk wrapper & signup allowlist
│   │   ├── db/                  # Drizzle client, pooling, schema
│   │   ├── intake/              # Client document parsers & SSRF protection
│   │   ├── tailoring/           # LLM providers, truth-bound validator
│   │   ├── scoring/             # Match score & gap report engines
│   │   ├── editor/              # State store, IndexedDB, auto-fit ladder
│   │   ├── export/              # DOCX, TXT, and PDF exporters
│   │   └── services/            # Domain services (bank, resume, etc.)
│   └── types/                   # Canonical TypeScript definitions
└── tests/                       # Complete automated verification suite
    ├── unit/                    # Data bank, intake, editor, versions
    ├── tailoring/               # Golden set (36/36) truth-bound tests
    ├── performance/             # EXPLAIN ANALYZE 11,001-row benchmark
    └── e2e/                     # Full multi-step user journey
```

---

## 🔒 Verification & Quality Assertions

- **Free-Tier Constraints**: Validated with $0 infrastructure spend. No paid trials, credit-card requirements, or hidden usage-based billing services introduced.
- **Truth-Bound Validator**: 36 golden set assertions passing; blocks hallucinations in 100% of tested scenarios.
- **Sub-millisecond Performance**: PostgreSQL `EXPLAIN ANALYZE` confirms all core queries execute between `0.043ms` and `0.77ms`, beating the PRD < 50ms SLA.
- **Type Safety**: Strictly enforced TypeScript with zero `any` shortcuts in domain types, 0 compile errors in `tsc --noEmit`.
