export interface ProjectAngleCandidateBullet {
  id?: string;
  text: string;
  sortOrder?: number | null;
  relevanceScore?: number;
  tags?: string[];
}

export interface ProjectAngleInput {
  title?: string | null;
  descriptionContext?: string | null;
  bullets: ProjectAngleCandidateBullet[];
  jdKeywords?: string[];
  jdTitle?: string | null;
  confidenceRank?: number | null;
  maxBullets?: number;
}

export interface ProjectAngleSelection {
  bullets: string[];
  matchedAngle: string | null;
  matchedKeywords: string[];
  relevanceScore: number;
  confidenceBonus: number;
  totalScore: number;
  usedSummaryPointsCount: number;
}

interface ScoredCandidate {
  text: string;
  source: "bullet" | "summary";
  index: number;
  jdMatches: number;
  domainMatches: number;
  hasMetric: boolean;
  preScore: number;
  score: number;
}

const DOMAIN_BUCKETS: Array<{ label: string; terms: string[] }> = [
  {
    label: "AI & LLM Agents",
    terms: [
      "llm",
      "agent",
      "agents",
      "rag",
      "embedding",
      "embeddings",
      "vector",
      "semantic",
      "retrieval",
      "prompt",
      "nlp",
      "openai",
      "gemini",
      "groq",
      "langchain",
      "langgraph",
      "eval",
      "evals",
      "ml",
      "machine learning",
      "model",
      "inference",
      "fine-tune",
      "ocr",
      "classification",
    ],
  },
  {
    label: "Backend & Systems",
    terms: [
      "api",
      "apis",
      "backend",
      "sql",
      "postgres",
      "postgresql",
      "database",
      "schema",
      "query",
      "queries",
      "redis",
      "queue",
      "queues",
      "worker",
      "workers",
      "distributed",
      "concurrency",
      "latency",
      "throughput",
      "caching",
      "auth",
      "security",
      "flask",
      "fastapi",
      "django",
      "node",
      "express",
      "prisma",
      "microservice",
      "server",
      "webhook",
    ],
  },
  {
    label: "Frontend & UX",
    terms: [
      "frontend",
      "ui",
      "ux",
      "react",
      "next.js",
      "nextjs",
      "typescript",
      "javascript",
      "tailwind",
      "css",
      "html",
      "responsive",
      "component",
      "dashboard",
      "accessibility",
      "design",
      "client",
      "ssr",
      "state",
      "browser",
    ],
  },
  {
    label: "Cloud & DevOps",
    terms: [
      "cloud",
      "cloudflare",
      "docker",
      "kubernetes",
      "ci/cd",
      "deploy",
      "deployment",
      "aws",
      "gcp",
      "serverless",
      "wrangler",
      "monitoring",
      "observability",
      "pipeline",
    ],
  },
  {
    label: "Data & Analytics",
    terms: [
      "analytics",
      "etl",
      "ranking",
      "recommender",
      "recommendation",
      "personalisation",
      "personalization",
      "index",
      "search",
      "pandas",
      "numpy",
      "normalization",
      "metrics",
      "forecasting",
    ],
  },
];

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "into",
  "using",
  "built",
  "developed",
  "created",
  "designed",
  "implemented",
  "engineered",
  "system",
  "platform",
  "application",
  "project",
  "user",
  "users",
]);

function normalizeLower(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function tokenizeWords(text: string): Set<string> {
  const words = normalizeLower(text)
    .replace(/[^a-z0-9+.#/\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
  return new Set(words);
}

/**
 * Detects concise stack-tag lines like "Next.js | PostgreSQL | Redis"
 * so they remain pinned cleanly at the top of project points when present.
 */
export function isPipeTechStackLine(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || !trimmed.includes("|")) return false;
  const segments = trimmed
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
  if (segments.length < 2 || trimmed.length > 150) return false;
  // Reject prose sentences joined by pipes
  const avgWords =
    segments.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / segments.length;
  return avgWords <= 3.5;
}

/**
 * Splits a project's free-form description/context note into clean candidate statements
 * without breaking dotted tech names (Next.js, Node.js) or decimal numbers (99.9%).
 */
export function splitSummaryIntoPoints(summary?: string | null): string[] {
  if (!summary) return [];
  const rawLines = summary
    .replace(/\r\n/g, "\n")
    .split(/\n+/)
    .map((line) => line.replace(/^[\s•*\-–—]+/, "").trim())
    .filter(Boolean);

  const points: string[] = [];
  for (const line of rawLines) {
    if (isPipeTechStackLine(line)) continue;
    // Split on sentence boundaries ". " or "; " only when followed by a word or uppercase letter,
    // avoiding ".js", ".py", "e.g.", or decimals like "99.5%".
    const protectedText = line
      .replace(/\b(e\.g|i\.e|vs|etc)\./gi, "$1__DOT__")
      .replace(/(\w)\.(js|ts|py|io|ai|net)\b/gi, "$1__DOT__$2")
      .replace(/(\d)\.(\d)/g, "$1__DOT__$2");

    const fragments = protectedText
      .split(/(?<=[.!?])\s+(?=[A-Z0-9])|;\s+/)
      .map((s) => s.replace(/__DOT__/g, ".").trim())
      .filter((s) => s.length >= 20);

    for (const fragment of fragments) {
      const cleaned = fragment.endsWith(".") ? fragment : `${fragment}.`;
      points.push(cleaned);
    }
  }

  return points;
}

function isDuplicateStatement(candidate: string, existingTexts: string[]): boolean {
  const candNorm = normalizeLower(candidate);
  const candTokens = tokenizeWords(candidate);
  if (candTokens.size === 0) return true;

  for (const existing of existingTexts) {
    const existingNorm = normalizeLower(existing);
    if (existingNorm.includes(candNorm) || candNorm.includes(existingNorm)) {
      return true;
    }
    const existingTokens = tokenizeWords(existing);
    if (existingTokens.size === 0) continue;

    let overlap = 0;
    for (const t of candTokens) {
      if (existingTokens.has(t)) overlap++;
    }
    const minLen = Math.min(candTokens.size, existingTokens.size);
    if (minLen > 0 && overlap / minLen >= 0.65) {
      return true;
    }
  }
  return false;
}

function countTermMatches(textLower: string, terms: string[]): string[] {
  const matched: string[] = [];
  for (const term of terms) {
    const normTerm = term.trim().toLowerCase();
    if (!normTerm || normTerm.length < 2) continue;
    if (textLower.includes(normTerm)) {
      matched.push(term);
    }
  }
  return matched;
}

function getActiveDomainBuckets(
  jdKeywords: string[],
  jdTitle?: string | null
): Array<{ label: string; terms: string[] }> {
  const jdBlob = normalizeLower(`${jdTitle || ""} ${jdKeywords.join(" ")}`);
  if (!jdBlob) return [];
  return DOMAIN_BUCKETS.filter((bucket) =>
    bucket.terms.some((term) => jdBlob.includes(term))
  );
}

/**
 * Converts a user-assigned project confidence rank (0 = #1 highest confidence)
 * into a meaningful scoring bonus so user preference guides selection cleanly.
 */
export function confidenceRankToBonus(confidenceRank?: number | null): number {
  if (typeof confidenceRank !== "number" || !Number.isFinite(confidenceRank) || confidenceRank < 0) {
    return 0;
  }
  return Math.max(0, 30 - Math.min(Math.floor(confidenceRank), 5) * 6);
}

const TECHNICAL_SIGNAL_TERMS = [
  "architected",
  "optimized",
  "engineered",
  "designed",
  "built",
  "implemented",
  "deployed",
  "redis",
  "postgresql",
  "postgres",
  "sqlite",
  "api",
  "apis",
  "latency",
  "throughput",
  "concurrency",
  "distributed",
  "serverless",
  "pipeline",
  "llm",
  "rag",
  "embeddings",
  "agent",
  "mcp",
  "queue",
  "queues",
  "caching",
  "normalization",
  "hmac",
  "next.js",
  "cloudflare",
  "prisma",
  "flask",
  "django",
  "python",
  "typescript",
];

const GENERIC_NON_TECH_PHRASES = [
  "serving as a core council",
  "handling logistics",
  "managing technical initiatives",
  "communication, and event operations",
];

/**
 * Ranks experience bullets so technical, quantified, and role-relevant bullets
 * always beat generic administrative bullets when space on A4 is budgeted.
 */
export function selectExperienceBulletsForRole<
  T extends { id?: string; text: string; sortOrder?: number | null },
>(params: {
  bullets: T[];
  jdKeywords?: string[];
  jdTitle?: string | null;
  maxBullets?: number;
}): T[] {
  const maxBullets = Math.max(1, params.maxBullets ?? 4);
  const bullets = params.bullets || [];
  if (bullets.length <= maxBullets && (!params.jdKeywords || params.jdKeywords.length === 0)) {
    return bullets;
  }

  const jdKeywords = (params.jdKeywords ?? []).map((k) => k.trim()).filter((k) => k.length >= 2);
  const activeDomains = getActiveDomainBuckets(jdKeywords, params.jdTitle);
  const titleTerms = tokenizeWords(params.jdTitle ?? "");

  const scored = bullets.map((b, idx) => {
    const lower = normalizeLower(b.text);
    const jdHits = countTermMatches(lower, jdKeywords).length;
    let domainHits = 0;
    for (const bucket of activeDomains) {
      if (bucket.terms.some((term) => lower.includes(term))) domainHits++;
    }
    let titleHits = 0;
    for (const t of titleTerms) {
      if (lower.includes(t)) titleHits++;
    }
    const techSignalCount = TECHNICAL_SIGNAL_TERMS.filter((t) => lower.includes(t)).length;
    const hasMetric = /\d+(?:\.\d+)?[%+x]|\b\d{2,}\b|<\s*\d+ms/i.test(b.text);
    const isGenericAdmin =
      !hasMetric && GENERIC_NON_TECH_PHRASES.some((phrase) => lower.includes(phrase));

    const score =
      jdHits * 14 +
      titleHits * 6 +
      domainHits * 5 +
      Math.min(techSignalCount, 4) * 5 +
      (hasMetric ? 9 : 0) -
      (isGenericAdmin ? 12 : 0);

    return { bullet: b, idx, score };
  });

  return scored
    .sort((a, b) => b.score - a.score || a.idx - b.idx)
    .slice(0, maxBullets)
    .map((s) => s.bullet);
}

/**
 * Resolves the candidate's real narrative summary from Vault profile entries,
 * skipping short contact-only rows or duplicates of the headline.
 */
export function extractProfileSummaryFromEntries(
  entries: Array<{
    entryType?: string;
    title?: string | null;
    descriptionContext?: string | null;
    bullets?: Array<{ text: string }> | null;
  }>,
  headline?: string | null
): string {
  const cleanHeadline = normalizeLower(headline || "");
  const profileEntries = entries.filter((e) => e.entryType === "profile");
  const candidates: Array<{ text: string; priority: number }> = [];

  for (const entry of profileEntries) {
    const isSummaryTitle = /summary|about|bio|profile overview/i.test(entry.title || "");
    const texts = [
      entry.descriptionContext || "",
      ...(entry.bullets || []).map((b) => b.text || ""),
    ];
    for (const raw of texts) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      if (/^(email|phone|headline|link|location|github|linkedin|portfolio)\s*:/i.test(trimmed)) {
        continue;
      }
      if (cleanHeadline && normalizeLower(trimmed) === cleanHeadline) {
        continue;
      }
      if (trimmed.length < 35 && !isSummaryTitle) continue;
      candidates.push({
        text: trimmed,
        priority: (isSummaryTitle ? 1000 : 0) + trimmed.length,
      });
    }
  }

  candidates.sort((a, b) => b.priority - a.priority);
  return candidates[0]?.text || "";
}

/**
 * Returns award issuer/details only when distinct from the award title itself.
 */
export function normalizeDistinctAwardIssuer(
  title?: string | null,
  issuer?: string | null
): string {
  const cleanTitle = normalizeLower(title || "");
  const cleanIssuer = (issuer || "").trim();
  if (!cleanIssuer) return "";
  if (normalizeLower(cleanIssuer) === cleanTitle) return "";
  return cleanIssuer;
}

/**
 * Selects the strongest role-tailored bullets for a project from both its existing bullets
 * and its multi-angle `descriptionContext` summary notes, without inventing any facts.
 */
export function selectProjectAnglePoints(input: ProjectAngleInput): ProjectAngleSelection {
  const maxBullets = Math.max(1, input.maxBullets ?? 2);
  const jdKeywords = (input.jdKeywords ?? [])
    .map((k) => k.trim())
    .filter((k) => k.length >= 2);
  const hasTargetRole = jdKeywords.length > 0 || Boolean(input.jdTitle?.trim());

  const cleanBullets = (input.bullets ?? [])
    .map((b) => ({ ...b, text: (b.text ?? "").trim() }))
    .filter((b) => b.text.length > 0);

  const stackLine = cleanBullets.find((b) => isPipeTechStackLine(b.text))?.text ?? null;
  const contentBullets = cleanBullets.filter((b) => b.text !== stackLine);

  const summaryPoints = splitSummaryIntoPoints(input.descriptionContext).filter(
    (sp) => !isDuplicateStatement(sp, contentBullets.map((b) => b.text))
  );

  const activeDomains = getActiveDomainBuckets(jdKeywords, input.jdTitle);
  const titleTerms = tokenizeWords(input.jdTitle ?? "");

  const candidates: ScoredCandidate[] = [
    ...contentBullets.map((b, idx) => ({
      text: b.text,
      source: "bullet" as const,
      index: idx,
      jdMatches: 0,
      domainMatches: 0,
      hasMetric: /\d/.test(b.text),
      preScore: b.relevanceScore ?? 0,
      score: 0,
    })),
    ...summaryPoints.map((sp, idx) => ({
      text: sp,
      source: "summary" as const,
      index: idx,
      jdMatches: 0,
      domainMatches: 0,
      hasMetric: /\d/.test(sp),
      preScore: 0,
      score: 0,
    })),
  ];

  const matchedKeywordSet = new Set<string>();
  const combinedProjectText = normalizeLower(
    `${input.title ?? ""} ${input.descriptionContext ?? ""} ${cleanBullets.map((b) => b.text).join(" ")}`
  );
  for (const kw of countTermMatches(combinedProjectText, jdKeywords)) {
    matchedKeywordSet.add(kw);
  }

  for (const cand of candidates) {
    const lower = normalizeLower(cand.text);
    const jdHits = countTermMatches(lower, jdKeywords);
    let domainHits = 0;
    for (const bucket of activeDomains) {
      if (bucket.terms.some((term) => lower.includes(term))) {
        domainHits++;
      }
    }
    let titleOverlap = 0;
    for (const t of titleTerms) {
      if (lower.includes(t)) titleOverlap++;
    }

    cand.jdMatches = jdHits.length + titleOverlap;
    cand.domainMatches = domainHits;

    if (hasTargetRole) {
      cand.score =
        cand.jdMatches * 14 +
        cand.domainMatches * 5 +
        (cand.preScore > 0 ? Math.min(cand.preScore, 100) * 0.15 : 0) +
        (cand.hasMetric ? 2.5 : 0) +
        (cand.source === "bullet" ? 1.5 : 0);
    } else {
      // Without a target JD, preserve user's existing bullets first, only supplementing
      // from descriptionContext if the user has fewer than maxBullets bullets.
      cand.score =
        (cand.source === "bullet" ? 100 - cand.index : 10 - cand.index) +
        (cand.hasMetric ? 0.5 : 0);
    }
  }

  // Sort candidates descending by role score, preserving original order on ties
  const ranked = [...candidates].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.source !== b.source) return a.source === "bullet" ? -1 : 1;
    return a.index - b.index;
  });

  const picked = ranked.slice(0, maxBullets);
  // Keep original bullet order when two chosen existing bullets tie cleanly, otherwise role relevance order
  const selectedContent = picked.map((c) => c.text);
  const finalBullets = stackLine ? [stackLine, ...selectedContent] : selectedContent;

  // Determine the strongest matched angle label for UI/diagnostics
  let matchedAngle: string | null = null;
  if (hasTargetRole && activeDomains.length > 0) {
    const selectedTextLower = normalizeLower(selectedContent.join(" "));
    let bestBucket: { label: string; count: number } | null = null;
    for (const bucket of activeDomains) {
      const count = bucket.terms.filter((term) => selectedTextLower.includes(term)).length;
      if (count > 0 && (!bestBucket || count > bestBucket.count)) {
        bestBucket = { label: bucket.label, count };
      }
    }
    matchedAngle = bestBucket?.label ?? null;
  }

  const relevanceScore =
    matchedKeywordSet.size * 10 +
    picked.reduce((sum, item) => sum + item.jdMatches * 3 + item.domainMatches * 2, 0);
  const confidenceBonus = confidenceRankToBonus(input.confidenceRank);

  return {
    bullets: finalBullets,
    matchedAngle,
    matchedKeywords: Array.from(matchedKeywordSet),
    relevanceScore,
    confidenceBonus,
    totalScore: relevanceScore + confidenceBonus,
    usedSummaryPointsCount: picked.filter((p) => p.source === "summary").length,
  };
}

/**
 * Ranks projects using combined target-role relevance and user confidence rank (sortOrder).
 */
export function sortProjectsByConfidenceAndRelevance<
  T extends {
    title?: string | null;
    descriptionContext?: string | null;
    sortOrder?: number | null;
    bullets?: ProjectAngleCandidateBullet[] | null;
  },
>(projects: T[], jdKeywords?: string[], jdTitle?: string | null): T[] {
  const hasJd = (jdKeywords?.length ?? 0) > 0 || Boolean(jdTitle?.trim());
  return projects
    .map((project, idx) => {
      const selection = selectProjectAnglePoints({
        title: project.title,
        descriptionContext: project.descriptionContext,
        bullets: project.bullets ?? [],
        jdKeywords,
        jdTitle,
        confidenceRank: project.sortOrder ?? idx,
      });
      return { project, idx, selection };
    })
    .sort((a, b) => {
      if (hasJd) {
        if (b.selection.totalScore !== a.selection.totalScore) {
          return b.selection.totalScore - a.selection.totalScore;
        }
      }
      const rankA = a.project.sortOrder ?? Number.MAX_SAFE_INTEGER;
      const rankB = b.project.sortOrder ?? Number.MAX_SAFE_INTEGER;
      if (rankA !== rankB) return rankA - rankB;
      return a.idx - b.idx;
    })
    .map((item) => item.project);
}
