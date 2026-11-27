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
    pattern: /\b(python|pytorch|tensorflow|scikit|pandas|numpy|ml|ai|llm|llms|rag|agents?|agentic|embeddings?|generative ai|prompt engineering|ocr|ai automation|mediapipe|object detection|langchain|xgboost|opencv|nlp|matplotlib)\b/i,
  },
  {
    domain: "Frontend & UI",
    pattern: /\b(react|next\.?js|typescript|javascript|tailwind|html|css|vue|angular|svelte|figma|ui|ux|redux)\b/i,
  },
  {
    domain: "Backend & APIs",
    pattern: /\b(node\.?js|express|fastapi|django|flask|go|golang|rust|java|spring|graphql|rest|trpc|c\+\+|microservices|prisma)\b/i,
  },
  {
    domain: "Databases & Streaming",
    pattern: /\b(postgres|postgresql|mysql|sqlite|mongodb|redis|kafka|drizzle|prisma|sql|dynamodb|supabase|cloudsql)\b/i,
  },
  {
    domain: "Cloud, DevOps & Security",
    pattern: /\b(aws|gcp|google cloud|azure|docker|kubernetes|k8s|ci\/cd|linux|osint|siem|nmap|iam|terraform|vercel|cloudflare|wrangler|firebase)\b/i,
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

const VAULT_CATEGORY_RULES: Array<{ category: string; pattern: RegExp }> = [
  {
    category: "AI & GenAI",
    pattern: /\b(generative ai|genai|llms?|large language|rag|retrieval|ai agents?|embeddings?|prompt(?: engineering)?|nlp|ocr|ai automation|openai|gemini|anthropic|claude|groq|langchain|langgraph|mcp|hugging ?face)\b/i,
  },
  {
    category: "ML & Computer Vision",
    pattern: /\b(tensorflow|pytorch|keras|scikit[- ]learn|sklearn|pandas|numpy|opencv|mediapipe|object detection|xgboost|machine learning|deep learning|computer vision|data science|matplotlib)\b/i,
  },
  {
    category: "Languages",
    pattern: /(?:^|[\s,/])(?:python|javascript|typescript|java|golang|go|rust|dart|sql|html\/css|html|css|c\+\+|c#|php|ruby|swift|kotlin|scala|c)(?=$|[\s,/])/i,
  },
  {
    category: "Databases & Tools",
    pattern: /\b(postgresql|postgres|cloudsql|sqlite|mysql|mongodb|redis|supabase|pinecone|weaviate|faiss|milvus|chroma|qdrant|pgvector|git|github|playwright|selenium|jest|vitest|pytest)\b/i,
  },
  {
    category: "Cloud & Deployment",
    pattern: /\b(cloudflare(?: workers| d1| r2)?|google cloud|gcp|aws|azure|vercel|firebase|wrangler|railway|docker|kubernetes|k8s|ci\/cd|github actions|terraform|linux)\b/i,
  },
  {
    category: "Web & Backend",
    pattern: /\b(react|next\.?js|flask|django|fastapi|node\.?js|express|tailwind(?:\s*css)?|rest(?:ful)?\s*apis?|prisma(?:\s*orm)?|drizzle|graphql|flutter|trpc)\b/i,
  },
];

/**
 * Maps an individual unlinked skill into its canonical Career Vault / Graph category.
 */
export function classifySkillGroupName(skillName: string): string {
  const clean = skillName.trim();
  if (!clean) return "Core Skills";
  for (const rule of VAULT_CATEGORY_RULES) {
    if (rule.pattern.test(clean)) {
      return rule.category;
    }
  }
  return "Core Skills";
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
    if (
      edge.relationshipType !== "used_skill" &&
      edge.relationshipType !== "skill_used_in_project" &&
      edge.relationshipType !== "skill_used_in_experience" &&
      edge.relationshipType !== "demonstrated_competency"
    ) {
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
