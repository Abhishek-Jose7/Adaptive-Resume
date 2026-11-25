import { BankEntry, EntryType } from "@/types/bank";

export interface EntryFormSuggestions {
  organizations: string[];
  locations: string[];
  contextTechHints: string[];
  contextPrompts: string[];
  similarEntry: {
    id: string;
    title: string;
    organization?: string | null;
    entryType: EntryType;
  } | null;
}

export interface BulletDraftSuggestion {
  label: string;
  text: string;
  sourceHint: string;
}

export interface BulletSuggestions {
  evidencedSkillsToAdd: string[];
  vaultContextTools: string[];
  draftSuggestions: BulletDraftSuggestion[];
  metricHint: string | null;
}

const CANONICAL_SKILLS: Array<{ label: string; pattern: RegExp }> = [
  { label: "TypeScript", pattern: /\btypescript\b/i },
  { label: "JavaScript", pattern: /\bjavascript\b/i },
  { label: "Python", pattern: /\bpython\b/i },
  { label: "Java", pattern: /\bjava\b(?!script)/i },
  { label: "C++", pattern: /\bc\+\+/i },
  { label: "C", pattern: /(?:^|[\s,/(])c(?:$|[\s,/])/i },
  { label: "Go", pattern: /\bgolang\b/i },
  { label: "Rust", pattern: /\brust\b/i },
  { label: "SQL", pattern: /\bsql\b/i },
  { label: "React", pattern: /\breact(?:\.?js)?\b(?!\s+native)/i },
  { label: "React Native", pattern: /\breact\s+native\b/i },
  { label: "Next.js", pattern: /\bnext\.?js\b/i },
  { label: "Node.js", pattern: /\bnode\.?js\b/i },
  { label: "NestJS", pattern: /\bnest\.?js\b/i },
  { label: "FastAPI", pattern: /\bfastapi\b/i },
  { label: "Flask", pattern: /\bflask\b/i },
  { label: "Django", pattern: /\bdjango\b/i },
  { label: "Flutter", pattern: /\bflutter\b/i },
  { label: "Tailwind CSS", pattern: /\btailwind(?:\s*css)?\b/i },
  { label: "HTML5", pattern: /\bhtml5?\b/i },
  { label: "CSS3", pattern: /\bcss3?\b/i },
  { label: "PostgreSQL", pattern: /\b(?:postgresql|postgres)\b/i },
  { label: "SQLite", pattern: /\bsqlite\b/i },
  { label: "MongoDB", pattern: /\bmongodb\b/i },
  { label: "Redis", pattern: /\bredis\b/i },
  { label: "BullMQ", pattern: /\bbullmq\b/i },
  { label: "Prisma ORM", pattern: /\bprisma\b/i },
  { label: "Firebase", pattern: /\bfirebase|firestore\b/i },
  { label: "GraphQL", pattern: /\bgraphql\b/i },
  { label: "REST APIs", pattern: /\brest(?:ful)?\s*(?:api|apis)?\b/i },
  { label: "WebSockets", pattern: /\bwebsockets?\b/i },
  { label: "AWS", pattern: /\b(?:aws|amazon web services)\b/i },
  { label: "Google Cloud", pattern: /\b(?:google cloud|gcp)\b/i },
  { label: "Docker", pattern: /\bdocker\b/i },
  { label: "Kubernetes", pattern: /\b(?:kubernetes|k8s)\b/i },
  { label: "Linux", pattern: /\blinux\b/i },
  { label: "Git", pattern: /\bgit\b/i },
  { label: "CI/CD", pattern: /\bci\/cd\b/i },
  { label: "Kafka", pattern: /\bkafka\b/i },
  { label: "TensorFlow", pattern: /\btensorflow\b/i },
  { label: "PyTorch", pattern: /\bpytorch\b/i },
  { label: "Scikit-learn", pattern: /\bscikit-?learn\b/i },
  { label: "XGBoost", pattern: /\bxgboost\b/i },
  { label: "Pandas", pattern: /\bpandas\b/i },
  { label: "NumPy", pattern: /\bnumpy\b/i },
  { label: "Matplotlib", pattern: /\bmatplotlib\b/i },
  { label: "Chart.js", pattern: /\bchart\.?js\b/i },
  { label: "Mapbox", pattern: /\bmapbox\b/i },
  { label: "Google Maps API", pattern: /\bgoogle maps api\b/i },
  { label: "OR-Tools", pattern: /\bor-?tools\b/i },
  { label: "OSINT", pattern: /\bosint\b/i },
  { label: "SIEM", pattern: /\bsiem\b/i },
  { label: "Nmap", pattern: /\bnmap\b/i },
  { label: "RAG", pattern: /\b(?:rag|retrieval[- ]augmented generation)\b/i },
  { label: "Playwright", pattern: /\bplaywright\b/i },
  { label: "Vitest", pattern: /\bvitest\b/i },
];

const WEAK_LEAD_INS: Array<{ pattern: RegExp; replacement: string; note: string }> = [
  {
    pattern: /^worked on\s+/i,
    replacement: "Contributed to ",
    note: "Stronger collaborative verb without overstating ownership",
  },
  {
    pattern: /^helped\s+(?:with|to)?\s*/i,
    replacement: "Supported ",
    note: "Direct active phrasing grounded in your actual role",
  },
  {
    pattern: /^responsible for\s+/i,
    replacement: "Managed ",
    note: "Replaces passive phrasing with an action verb",
  },
  {
    pattern: /^made\s+/i,
    replacement: "Built ",
    note: "Stronger engineering verb for implementation",
  },
  {
    pattern: /^did\s+/i,
    replacement: "Executed ",
    note: "Clear action verb",
  },
  {
    pattern: /^was part of\s+/i,
    replacement: "Collaborated on ",
    note: "Highlights team contribution truthfully",
  },
];

function normalizeCompare(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9+#.\s]/g, " ").replace(/\s+/g, " ").trim();
}

function tokenizeWords(value: string): string[] {
  return normalizeCompare(value)
    .split(" ")
    .filter((token) => token.length >= 2);
}

/**
 * Extracts canonical skills/tools referenced anywhere in free text or structured facts.
 * Grounded purely in the user's own stored text/facts.
 */
export function extractToolsFromText(text: string): string[] {
  if (!text.trim()) return [];
  const found: string[] = [];
  const seen = new Set<string>();

  for (const skill of CANONICAL_SKILLS) {
    if (skill.pattern.test(text) && !seen.has(skill.label.toLowerCase())) {
      seen.add(skill.label.toLowerCase());
      found.push(skill.label);
    }
  }
  return found;
}

/**
 * Collects all skill strings already cataloged inside `skill_group` entries.
 */
export function collectCatalogedSkills(entries: BankEntry[]): Set<string> {
  const cataloged = new Set<string>();
  for (const entry of entries) {
    if (entry.entryType !== "skill_group") continue;
    for (const bullet of entry.bullets || []) {
      const parts = bullet.text
        .split(/[,•|;]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      for (const part of parts) {
        cataloged.add(part.toLowerCase());
        const canonical = extractToolsFromText(part);
        for (const item of canonical) {
          cataloged.add(item.toLowerCase());
        }
      }
    }
  }
  return cataloged;
}

/**
 * Collects unique tools/technologies evidenced in non-skill-group vault entries
 * (bullets, entry context, titles, and tool/technology facts).
 */
export function collectEvidencedVaultTools(
  entries: BankEntry[],
  options?: { excludeEntryId?: string; includeSkillGroups?: boolean }
): Array<{ tool: string; sourceTitle: string }> {
  const results: Array<{ tool: string; sourceTitle: string }> = [];
  const seen = new Set<string>();

  const addTool = (raw: string, sourceTitle: string) => {
    const clean = raw.trim();
    if (!clean) return;
    const key = clean.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    results.push({ tool: clean, sourceTitle });
  };

  for (const entry of entries) {
    if (options?.excludeEntryId && entry.id === options.excludeEntryId) continue;
    if (!options?.includeSkillGroups && entry.entryType === "skill_group") continue;

    for (const fact of entry.facts || []) {
      if (fact.factType === "tool" || fact.factType === "technology") {
        addTool(fact.valueText, entry.title);
      }
    }

    const entryTextChunks = [
      entry.title,
      entry.descriptionContext || "",
      ...(entry.bullets || []).map((b) => b.text),
    ].join(" \n ");

    for (const tool of extractToolsFromText(entryTextChunks)) {
      addTool(tool, entry.title);
    }

    for (const bullet of entry.bullets || []) {
      for (const fact of bullet.facts || []) {
        if (fact.factType === "tool" || fact.factType === "technology") {
          addTool(fact.valueText, entry.title);
        }
      }
    }
  }

  return results;
}

/**
 * Generates truth-bound contextual suggestions for the Create/Edit BankEntry modal
 * grounded strictly in the user's already-existing Career Vault entries.
 */
export function getEntryFormSuggestions(params: {
  draftType: EntryType;
  draftTitle: string;
  draftOrg: string;
  draftLocation: string;
  draftContext: string;
  editingEntryId?: string | null;
  existingEntries: BankEntry[];
}): EntryFormSuggestions {
  const {
    draftType,
    draftTitle,
    draftOrg,
    draftLocation,
    draftContext,
    editingEntryId,
    existingEntries,
  } = params;

  const otherEntries = existingEntries.filter((e) => e.id !== editingEntryId);
  const currentOrgNorm = normalizeCompare(draftOrg);
  const currentLocNorm = normalizeCompare(draftLocation);
  const contextLower = draftContext.toLowerCase();

  // 1. Existing organizations (prioritize same entryType, filter by typed prefix if any)
  const orgCounts = new Map<string, { label: string; score: number }>();
  const locCounts = new Map<string, { label: string; score: number }>();

  for (const entry of existingEntries) {
    const typeBonus = entry.entryType === draftType ? 3 : 1;
    if (entry.organization?.trim()) {
      const org = entry.organization.trim();
      const key = normalizeCompare(org);
      if (key && key !== currentOrgNorm) {
        const existing = orgCounts.get(key);
        orgCounts.set(key, {
          label: existing?.label || org,
          score: (existing?.score || 0) + typeBonus,
        });
      }
    }
    if (entry.location?.trim()) {
      const loc = entry.location.trim();
      const key = normalizeCompare(loc);
      if (key && key !== currentLocNorm) {
        const existing = locCounts.get(key);
        locCounts.set(key, {
          label: existing?.label || loc,
          score: (existing?.score || 0) + typeBonus,
        });
      }
    }
  }

  const organizations = Array.from(orgCounts.values())
    .filter((item) => !currentOrgNorm || normalizeCompare(item.label).includes(currentOrgNorm))
    .sort((a, b) => b.score - a.score)
    .map((item) => item.label)
    .slice(0, 5);

  const locations = Array.from(locCounts.values())
    .filter((item) => !currentLocNorm || normalizeCompare(item.label).includes(currentLocNorm))
    .sort((a, b) => b.score - a.score)
    .map((item) => item.label)
    .slice(0, 4);

  // 2. Tools/tech already evidenced in vault that aren't in draftContext yet
  const vaultTools = collectEvidencedVaultTools(otherEntries, { includeSkillGroups: true });
  const contextTechHints = vaultTools
    .map((v) => v.tool)
    .filter((tool) => !contextLower.includes(tool.toLowerCase()))
    .slice(0, 8);

  // 3. Truth-bound context prompts based on existing vault state
  const contextPrompts: string[] = [];
  if (draftType === "experience" || draftType === "project" || draftType === "volunteer") {
    if (!draftContext.trim()) {
      const sampleSkills = contextTechHints.slice(0, 4);
      if (sampleSkills.length > 0) {
        contextPrompts.push(
          `Add the real problem, constraints, or stack used (your vault already lists: ${sampleSkills.join(", ")}) so bullet rewrites stay grounded.`
        );
      } else {
        contextPrompts.push(
          "Mention your team scope, technical constraints, and tools used — facts here can be cited truthfully when tailoring bullets."
        );
      }
    } else if (!/\d/.test(draftContext)) {
      contextPrompts.push(
        "If you know real scale numbers (users, team size, latency, dataset size), note them here so AI never has to ask later."
      );
    }
  } else if (draftType === "skill_group") {
    const cataloged = collectCatalogedSkills(existingEntries);
    const missingFromSkills = collectEvidencedVaultTools(existingEntries, {
      includeSkillGroups: false,
    })
      .map((t) => t.tool)
      .filter((t) => !cataloged.has(t.toLowerCase()))
      .slice(0, 5);

    if (missingFromSkills.length > 0) {
      contextPrompts.push(
        `Your experience/projects already mention ${missingFromSkills.join(", ")} — after saving this group, you can one-click add them as skills.`
      );
    }
  }

  // 4. Duplicate / overlap warning against already-existing Career Vault entries
  let similarEntry: EntryFormSuggestions["similarEntry"] = null;
  const titleTokens = tokenizeWords(draftTitle);
  if (titleTokens.length > 0) {
    const titleNorm = normalizeCompare(draftTitle);
    for (const candidate of otherEntries) {
      const candNorm = normalizeCompare(candidate.title);
      if (!candNorm) continue;

      const sameOrg =
        Boolean(currentOrgNorm) &&
        Boolean(candidate.organization) &&
        normalizeCompare(candidate.organization || "") === currentOrgNorm;

      const exactOrContained =
        titleNorm === candNorm ||
        (titleNorm.length >= 6 && (candNorm.includes(titleNorm) || titleNorm.includes(candNorm)));

      const candTokens = new Set(tokenizeWords(candidate.title));
      const shared = titleTokens.filter((t) => candTokens.has(t)).length;
      const overlap = shared / Math.max(titleTokens.length, candTokens.size, 1);

      if (exactOrContained || overlap >= 0.75 || (sameOrg && overlap >= 0.5)) {
        similarEntry = {
          id: candidate.id,
          title: candidate.title,
          organization: candidate.organization,
          entryType: candidate.entryType,
        };
        break;
      }
    }
  }

  return {
    organizations,
    locations,
    contextTechHints,
    contextPrompts,
    similarEntry,
  };
}

/**
 * Generates truth-bound suggestions when adding or editing bullets/skills inside an entry,
 * grounded strictly in the user's already-existing Career Vault entries.
 */
export function getBulletSuggestions(params: {
  targetEntry: BankEntry;
  draftText: string;
  existingEntries: BankEntry[];
}): BulletSuggestions {
  const { targetEntry, draftText, existingEntries } = params;
  const draftTrimmed = draftText.trim();
  const draftLower = draftTrimmed.toLowerCase();

  const existingEntryText = [
    targetEntry.title,
    targetEntry.descriptionContext || "",
    ...(targetEntry.bullets || []).map((b) => b.text),
  ]
    .join(" ")
    .toLowerCase();

  // Collect skills from existing Skill Groups vs evidenced in experiences/projects
  const catalogedSkills = collectCatalogedSkills(existingEntries);
  const nonSkillTools = collectEvidencedVaultTools(existingEntries, {
    includeSkillGroups: false,
  });

  if (targetEntry.entryType === "skill_group") {
    const evidencedSkillsToAdd = nonSkillTools
      .map((t) => t.tool)
      .filter((tool) => !catalogedSkills.has(tool.toLowerCase()))
      .filter((tool) => !draftLower || tool.toLowerCase().includes(draftLower))
      .slice(0, 10);

    return {
      evidencedSkillsToAdd,
      vaultContextTools: [],
      draftSuggestions: [],
      metricHint: null,
    };
  }

  // Gather tools already present in the user's vault (skill groups + sibling entries)
  const skillGroupTools: string[] = [];
  const seenSg = new Set<string>();
  for (const entry of existingEntries) {
    if (entry.entryType !== "skill_group") continue;
    for (const bullet of entry.bullets || []) {
      for (const item of bullet.text.split(/[,•|;]+/)) {
        const clean = item.trim();
        if (clean && clean.length <= 36 && !seenSg.has(clean.toLowerCase())) {
          seenSg.add(clean.toLowerCase());
          skillGroupTools.push(clean);
        }
      }
    }
  }

  const allVaultTools = [
    ...extractToolsFromText(`${targetEntry.title} ${targetEntry.descriptionContext || ""}`),
    ...skillGroupTools,
    ...nonSkillTools.map((t) => t.tool),
  ];

  const vaultContextTools: string[] = [];
  const seenTool = new Set<string>();
  for (const tool of allVaultTools) {
    const lower = tool.toLowerCase();
    if (seenTool.has(lower)) continue;
    seenTool.add(lower);
    if (draftLower && draftLower.includes(lower)) continue;
    // If user is typing a partial word, rank/filter matching tools; otherwise prioritize tools not yet in this entry's bullets
    vaultContextTools.push(tool);
  }

  const prioritizedTools = vaultContextTools
    .sort((a, b) => {
      const aInContext = (targetEntry.descriptionContext || "").toLowerCase().includes(a.toLowerCase()) ? 1 : 0;
      const bInContext = (targetEntry.descriptionContext || "").toLowerCase().includes(b.toLowerCase()) ? 1 : 0;
      if (aInContext !== bInContext) return bInContext - aInContext;
      const aUnused = existingEntryText.includes(a.toLowerCase()) ? 0 : 1;
      const bUnused = existingEntryText.includes(b.toLowerCase()) ? 0 : 1;
      return bUnused - aUnused;
    })
    .slice(0, 8);

  const draftSuggestions: BulletDraftSuggestion[] = [];

  // 1. Weak verb upgrade if the user is typing a weak lead-in
  if (draftTrimmed) {
    for (const rule of WEAK_LEAD_INS) {
      if (rule.pattern.test(draftTrimmed)) {
        const upgraded = draftTrimmed.replace(rule.pattern, rule.replacement);
        draftSuggestions.push({
          label: "Stronger phrasing",
          text: upgraded.charAt(0).toUpperCase() + upgraded.slice(1),
          sourceHint: rule.note,
        });
        break;
      }
    }
  } else {
    // 2. Grounded draft starters using tools actually evidenced in this entry's context or existing vault
    const entryContextTools = extractToolsFromText(
      `${targetEntry.title} ${targetEntry.descriptionContext || ""}`
    );
    if (entryContextTools.length > 0 && (targetEntry.entryType === "experience" || targetEntry.entryType === "project")) {
      const toolPhrase = entryContextTools.slice(0, 2).join(" and ");
      draftSuggestions.push({
        label: "From this entry's context",
        text: `Implemented [core feature/workflow] using ${toolPhrase}, resulting in [verified outcome]`,
        sourceHint: `Grounded in tools from "${targetEntry.title}"`,
      });
    } else if (
      prioritizedTools.length > 0 &&
      (targetEntry.entryType === "experience" || targetEntry.entryType === "project")
    ) {
      const siblingTool = prioritizedTools[0];
      draftSuggestions.push({
        label: "From your existing skills",
        text: `Built [component or system] with ${siblingTool}, improving [measurable outcome]`,
        sourceHint: `Uses ${siblingTool} already in your Career Vault`,
      });
    }
  }

  // 3. Truth-bound metric reminder if typing an achievement entry without numbers
  let metricHint: string | null = null;
  if (
    (targetEntry.entryType === "experience" ||
      targetEntry.entryType === "project" ||
      targetEntry.entryType === "volunteer") &&
    draftTrimmed.length >= 12 &&
    !/\d/.test(draftTrimmed)
  ) {
    metricHint =
      "Tip: Add a real, verifiable number if you have one (e.g., users served, latency ms, % change, or team size).";
  }

  return {
    evidencedSkillsToAdd: [],
    vaultContextTools: prioritizedTools,
    draftSuggestions: draftSuggestions.slice(0, 3),
    metricHint,
  };
}
