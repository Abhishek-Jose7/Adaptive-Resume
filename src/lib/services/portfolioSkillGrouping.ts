export interface DomainSkillBadgeGroup {
  domain: string;
  skills: Array<{
    name: string;
    evidenceCount: number;
    source: "career_graph" | "skill_group";
  }>;
}

const DOMAIN_RULES: Array<{ domain: string; pattern: RegExp }> = [
  {
    domain: "AI, ML & Data",
    pattern: /\b(python|pytorch|tensorflow|scikit|pandas|numpy|ml|ai|llm|rag|langchain|xgboost|opencv|nlp|matplotlib)\b/i,
  },
  {
    domain: "Frontend & UI",
    pattern: /\b(react|next\.?js|typescript|javascript|tailwind|html|css|vue|angular|svelte|figma|ui|ux|redux)\b/i,
  },
  {
    domain: "Backend & APIs",
    pattern: /\b(node\.?js|express|fastapi|django|flask|go|golang|rust|java|spring|graphql|rest|trpc|c\+\+|microservices)\b/i,
  },
  {
    domain: "Databases & Streaming",
    pattern: /\b(postgres|postgresql|mysql|sqlite|mongodb|redis|kafka|drizzle|prisma|sql|dynamodb|supabase)\b/i,
  },
  {
    domain: "Cloud, DevOps & Security",
    pattern: /\b(aws|gcp|google cloud|azure|docker|kubernetes|k8s|ci\/cd|linux|osint|siem|nmap|iam|terraform|vercel|cloudflare)\b/i,
  },
];

export function classifySkillDomain(skillName: string): string {
  for (const rule of DOMAIN_RULES) {
    if (rule.pattern.test(skillName)) {
      return rule.domain;
    }
  }
  return "Engineering & Core Capabilities";
}

/**
 * Groups verified skills by technical domain using Career Graph `used_skill` / `demonstrated_competency`
 * edges as primary evidence counts, merged cleanly with explicit `skill_group` entries.
 */
export function buildDomainGroupedSkillBadges(params: {
  graphEdges: Array<{
    relationshipType: string;
    targetType: string;
    targetId: string;
    metadataJson?: unknown;
  }>;
  skillEntries?: Array<{
    title: string;
    bullets?: Array<{ text: string }>;
  }>;
}): DomainSkillBadgeGroup[] {
  const skillMap = new Map<
    string,
    { name: string; evidenceCount: number; source: "career_graph" | "skill_group" }
  >();

  for (const edge of params.graphEdges || []) {
    if (edge.relationshipType !== "used_skill" && edge.relationshipType !== "demonstrated_competency") {
      continue;
    }
    const meta = (edge.metadataJson as Record<string, unknown> | null) || {};
    const rawName =
      (typeof meta.skillName === "string" && meta.skillName) ||
      (edge.targetType === "skill" ? edge.targetId : "") ||
      (typeof meta.valueText === "string" && edge.targetType === "tool" ? meta.valueText : "");

    const cleanName = rawName.trim();
    if (!cleanName || cleanName.length > 50) continue;

    const key = cleanName.toLowerCase();
    const existing = skillMap.get(key);
    if (existing) {
      existing.evidenceCount += 1;
    } else {
      skillMap.set(key, {
        name: cleanName,
        evidenceCount: 1,
        source: "career_graph",
      });
    }
  }

  for (const entry of params.skillEntries || []) {
    for (const b of entry.bullets || []) {
      const tokens = b.text
        .split(/[,•|\n]/)
        .map((t) => t.trim())
        .filter((t) => t.length > 1 && t.length <= 45);
      for (const token of tokens) {
        const key = token.toLowerCase();
        if (!skillMap.has(key)) {
          skillMap.set(key, {
            name: token,
            evidenceCount: 1,
            source: "skill_group",
          });
        }
      }
    }
  }

  const groups = new Map<
    string,
    Array<{ name: string; evidenceCount: number; source: "career_graph" | "skill_group" }>
  >();

  for (const item of skillMap.values()) {
    const domain = classifySkillDomain(item.name);
    const list = groups.get(domain) || [];
    list.push(item);
    groups.set(domain, list);
  }

  return Array.from(groups.entries())
    .map(([domain, skills]) => ({
      domain,
      skills: skills.sort((a, b) => b.evidenceCount - a.evidenceCount || a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => b.skills.length - a.skills.length || a.domain.localeCompare(b.domain));
}
