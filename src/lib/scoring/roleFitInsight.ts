export interface RoleFitSkillRule {
  canonical: string;
  aliases: string[];
  pattern: RegExp;
  category: "technical_skill" | "tool" | "domain" | "soft_skill";
}

export const ROLE_FIT_TAXONOMY: RoleFitSkillRule[] = [
  {
    canonical: "LLMs",
    aliases: ["LLM", "LLMs", "Large Language Model", "Large Language Models", "GenAI", "Generative AI"],
    pattern: /\b(llms?|large language models?|genai|generative ai)\b/i,
    category: "domain",
  },
  {
    canonical: "AI Agents",
    aliases: ["AI Agent", "AI Agents", "Agent", "Agents", "Agentic", "Conversational Agents", "Multi-Agent", "Tool Use", "Tool Calling", "Function Calling"],
    pattern: /\b(ai agents?|conversational agents?|multi-agent|agentic|autonomous agents?|agents?|tool use|tool calling|function calling)\b/i,
    category: "domain",
  },
  {
    canonical: "Embeddings",
    aliases: ["Embeddings", "Embedding", "Vector Embeddings", "Semantic Embeddings", "Text Embeddings"],
    pattern: /\b(embeddings?|vector embeddings?|semantic embeddings?|text embeddings?)\b/i,
    category: "domain",
  },
  {
    canonical: "RAG",
    aliases: ["RAG", "Retrieval-Augmented Generation", "Retrieval Augmented Generation"],
    pattern: /\b(rag|retrieval[- ]augmented generation)\b/i,
    category: "domain",
  },
  {
    canonical: "Retrieval & Ranking",
    aliases: ["Retrieval", "Ranking", "Recommendations", "Recommender", "Personalisation", "Personalization"],
    pattern: /\b(retrieval|ranking|recommendations?|recommender|personalisation|personalization)\b/i,
    category: "domain",
  },
  {
    canonical: "Vector Databases",
    aliases: ["Vector DB", "Vector Database", "pgvector", "Pinecone", "Qdrant", "Chroma", "ChromaDB", "Weaviate", "FAISS", "Milvus", "Semantic Search"],
    pattern: /\b(vector (?:db|databases?|search|store)|pgvector|pinecone|qdrant|chroma(?:db)?|weaviate|faiss|milvus|semantic search)\b/i,
    category: "tool",
  },
  {
    canonical: "Fine-Tuning",
    aliases: ["Fine-Tuning", "Fine Tuning", "LoRA", "QLoRA", "PEFT", "RLHF"],
    pattern: /\b(fine[- ]tuning|lora|qlora|peft|rlhf)\b/i,
    category: "domain",
  },
  {
    canonical: "Prompt Engineering",
    aliases: ["Prompt Engineering", "LLM Prompting", "Structured Outputs", "Context Engineering"],
    pattern: /\b(prompt(?:ing| engineering)|llm prompting|context engineering|structured outputs?)\b/i,
    category: "domain",
  },
  {
    canonical: "Model Evaluation",
    aliases: ["Evals", "Evaluation", "LLM Evals", "Evaluate LLM"],
    pattern: /\b(evals|model evaluation|llm evals?|llm output quality|evaluation pipelines?)\b/i,
    category: "domain",
  },
  {
    canonical: "MCP",
    aliases: ["MCP", "Model Context Protocol"],
    pattern: /\b(mcp|model context protocol)\b/i,
    category: "tool",
  },
  {
    canonical: "OpenAI / Gemini / Anthropic APIs",
    aliases: ["OpenAI", "Gemini", "Claude", "Anthropic"],
    pattern: /\b(openai|gemini|anthropic|claude api)\b/i,
    category: "tool",
  },
  {
    canonical: "LangChain / LangGraph",
    aliases: ["LangChain", "LangGraph", "LlamaIndex"],
    pattern: /\b(langchain|langgraph|llamaindex)\b/i,
    category: "tool",
  },
  {
    canonical: "PyTorch",
    aliases: ["PyTorch"],
    pattern: /\b(pytorch)\b/i,
    category: "tool",
  },
  {
    canonical: "TensorFlow",
    aliases: ["TensorFlow", "Keras"],
    pattern: /\b(tensorflow|keras)\b/i,
    category: "tool",
  },
  {
    canonical: "Scikit-learn",
    aliases: ["Scikit-learn", "sklearn", "XGBoost", "ML", "Machine Learning"],
    pattern: /\b(scikit[- ]learn|sklearn|xgboost)\b/i,
    category: "tool",
  },
  {
    canonical: "Machine Learning",
    aliases: ["ML", "Machine Learning", "Deep Learning"],
    pattern: /\b(machine learning|deep learning|\bml\b)\b/i,
    category: "domain",
  },
  {
    canonical: "NLP",
    aliases: ["NLP", "Natural Language Processing"],
    pattern: /\b(nlp|natural language processing|transformers|hugging ?face)\b/i,
    category: "domain",
  },
  {
    canonical: "Computer Vision",
    aliases: ["Computer Vision", "OpenCV", "CV"],
    pattern: /\b(computer vision|opencv)\b/i,
    category: "domain",
  },
  {
    canonical: "Python",
    aliases: ["Python", "Py"],
    pattern: /\b(python)\b/i,
    category: "technical_skill",
  },
  {
    canonical: "TypeScript",
    aliases: ["TypeScript", "TS"],
    pattern: /\b(typescript)\b/i,
    category: "technical_skill",
  },
  {
    canonical: "JavaScript",
    aliases: ["JavaScript", "JS", "ES6"],
    pattern: /\b(javascript|es6)\b/i,
    category: "technical_skill",
  },
  {
    canonical: "React",
    aliases: ["React", "React.js", "ReactJS"],
    pattern: /\b(react|react\.?js|reactjs)\b/i,
    category: "technical_skill",
  },
  {
    canonical: "Next.js",
    aliases: ["Next.js", "NextJS"],
    pattern: /\b(next\.?js)\b/i,
    category: "technical_skill",
  },
  {
    canonical: "Node.js",
    aliases: ["Node.js", "NodeJS", "Node"],
    pattern: /\b(node\.?js)\b/i,
    category: "technical_skill",
  },
  {
    canonical: "FastAPI",
    aliases: ["FastAPI"],
    pattern: /\b(fastapi)\b/i,
    category: "tool",
  },
  {
    canonical: "Flask",
    aliases: ["Flask"],
    pattern: /\b(flask)\b/i,
    category: "tool",
  },
  {
    canonical: "Django",
    aliases: ["Django"],
    pattern: /\b(django)\b/i,
    category: "tool",
  },
  {
    canonical: "PostgreSQL",
    aliases: ["PostgreSQL", "Postgres", "PG"],
    pattern: /\b(postgresql|postgres|pgvector)\b/i,
    category: "tool",
  },
  {
    canonical: "Redis",
    aliases: ["Redis"],
    pattern: /\b(redis)\b/i,
    category: "tool",
  },
  {
    canonical: "SQL",
    aliases: ["SQL", "SQLite", "MySQL", "RDBMS"],
    pattern: /\b(sql|sqlite|mysql|rdbms)\b/i,
    category: "technical_skill",
  },
  {
    canonical: "MongoDB",
    aliases: ["MongoDB", "Mongo"],
    pattern: /\b(mongodb)\b/i,
    category: "tool",
  },
  {
    canonical: "GraphQL",
    aliases: ["GraphQL"],
    pattern: /\b(graphql)\b/i,
    category: "technical_skill",
  },
  {
    canonical: "REST API",
    aliases: ["REST", "RESTful", "REST API", "APIs"],
    pattern: /\b(rest(?:ful)?\s*apis?|web apis?)\b/i,
    category: "technical_skill",
  },
  {
    canonical: "Docker",
    aliases: ["Docker", "Containerization"],
    pattern: /\b(docker|containerization|containers)\b/i,
    category: "tool",
  },
  {
    canonical: "Kubernetes",
    aliases: ["Kubernetes", "K8s"],
    pattern: /\b(kubernetes|k8s)\b/i,
    category: "tool",
  },
  {
    canonical: "AWS",
    aliases: ["AWS", "Amazon Web Services"],
    pattern: /\b(aws|amazon web services)\b/i,
    category: "tool",
  },
  {
    canonical: "GCP",
    aliases: ["GCP", "Google Cloud"],
    pattern: /\b(gcp|google cloud)\b/i,
    category: "tool",
  },
  {
    canonical: "Azure",
    aliases: ["Azure"],
    pattern: /\b(azure)\b/i,
    category: "tool",
  },
  {
    canonical: "CI/CD",
    aliases: ["CI/CD", "GitHub Actions", "Continuous Integration"],
    pattern: /\b(ci\/cd|github actions|continuous integration)\b/i,
    category: "domain",
  },
  {
    canonical: "System Design",
    aliases: ["System Design", "Distributed Systems", "Microservices", "Scalable Architecture"],
    pattern: /\b(system design|distributed systems|microservices)\b/i,
    category: "domain",
  },
  {
    canonical: "Testing",
    aliases: ["Playwright", "Vitest", "Jest", "Pytest", "Unit Testing", "E2E"],
    pattern: /\b(playwright|vitest|jest|pytest|cypress|unit testing)\b/i,
    category: "tool",
  },
  {
    canonical: "Git",
    aliases: ["Git", "GitHub"],
    pattern: /\b(git|github)\b/i,
    category: "tool",
  },
  {
    canonical: "Go",
    aliases: ["Golang", "Go"],
    pattern: /\b(golang)\b/i,
    category: "technical_skill",
  },
  {
    canonical: "Rust",
    aliases: ["Rust"],
    pattern: /\b(rust)\b/i,
    category: "technical_skill",
  },
  {
    canonical: "Java",
    aliases: ["Java"],
    pattern: /\b(java)\b/i,
    category: "technical_skill",
  },
  {
    canonical: "C++",
    aliases: ["C++"],
    pattern: /(?:^|[\s,/(])c\+\+(?=$|[\s,/.)])/i,
    category: "technical_skill",
  },
  {
    canonical: "Tailwind CSS",
    aliases: ["Tailwind", "Tailwind CSS"],
    pattern: /\b(tailwind(?:\s*css)?)\b/i,
    category: "tool",
  },
];

export interface VaultEntryLite {
  id: string;
  entryType: string;
  title: string;
  organization?: string | null;
  descriptionContext?: string | null;
  bullets?: Array<{
    text: string;
    facts?: Array<{ valueText?: string | null }>;
  }>;
  facts?: Array<{ valueText?: string | null }>;
}

export interface RoleFitInsightResult {
  extractedTitle: string;
  score: number;
  matchedSkills: string[];
  tagOnlySkills: string[];
  missingSkills: string[];
  relevantEvidenceLabels: string[];
  suitabilityVerdict: string;
  summaryInsight: string;
  totalFactsCount: number;
}

function formatReadableList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

export function extractRoleTitleFromJd(rawText: string): string {
  const labeledMatch = rawText.match(
    /^(?:[-•*]\s*)?(?:role\s*title|job\s*title|position|role|title)\s*:\s*([A-Za-z0-9/+&()., -]{3,60})/im
  );
  if (labeledMatch?.[1]) {
    const cleaned = labeledMatch[1].split(/[\r\n|•]/)[0].trim();
    if (cleaned.length >= 3 && cleaned.length <= 60) {
      return cleaned;
    }
  }

  const firstLines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/^[-•*]\s*/, ""))
    .filter(
      (l) =>
        l.length >= 3 &&
        l.length <= 60 &&
        !/[.!?]$/.test(l) &&
        l.split(/\s+/).length <= 7 &&
        !/^(about|company|location|salary|overview|responsibilities|requirements)/i.test(l)
    );
  if (firstLines[0]) {
    return firstLines[0].slice(0, 60);
  }

  const proseMatch = rawText.match(
    /(?:looking for an?|seeking an?|hiring an?)\s+([A-Za-z0-9/+& -]{3,45}?)(?=\s+(?:experienced|with|who|to|for|in)\b|[.,;\r\n]|$)/i
  );
  if (proseMatch?.[1]) {
    const cleaned = proseMatch[1].trim();
    if (cleaned.length >= 3 && cleaned.length <= 55) {
      return cleaned;
    }
  }

  return "Target Role";
}

function isStackTagLine(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (!trimmed.includes("|")) return false;
  // Detect pipe-separated tech stack subtitles like "Next.js | Groq | RAG | Embeddings | NLP."
  const segments = trimmed.split("|").map((s) => s.trim()).filter(Boolean);
  return segments.length >= 2 && segments.every((seg) => seg.split(/\s+/).length <= 3);
}

/**
 * Synthesizes a direct, grounded role-fit insight comparing JD requirements against
 * the candidate's real Career Vault entries, distinguishing bullet-backed work from
 * mere tag/skill-list mentions.
 */
export function analyzeRoleFitAgainstVault(
  rawJdText: string,
  entries: VaultEntryLite[]
): RoleFitInsightResult {
  const extractedTitle = extractRoleTitleFromJd(rawJdText);
  const detectedRules = ROLE_FIT_TAXONOMY.filter((rule) => rule.pattern.test(rawJdText));

  const entryRecords = entries
    .filter((e) => e.entryType !== "profile")
    .map((entry) => {
      const isSkillEntry = entry.entryType === "skill_group" || entry.entryType === "skill";
      const bulletProofParts: string[] = [];
      const tagOnlyParts: string[] = [entry.title, entry.organization || "", entry.descriptionContext || ""];

      if (isSkillEntry) {
        for (const b of entry.bullets || []) tagOnlyParts.push(b.text);
      } else {
        for (const f of entry.facts || []) {
          if (f.valueText) bulletProofParts.push(f.valueText);
        }
        for (const b of entry.bullets || []) {
          if (isStackTagLine(b.text)) {
            tagOnlyParts.push(b.text);
          } else {
            bulletProofParts.push(b.text);
            for (const f of b.facts || []) {
              if (f.valueText) bulletProofParts.push(f.valueText);
            }
          }
        }
      }

      return {
        entry,
        bulletBlob: bulletProofParts.join(" \n "),
        tagBlob: tagOnlyParts.join(" \n "),
      };
    });

  const totalFactsCount = entries
    .filter((e) => e.entryType !== "skill_group" && e.entryType !== "skill")
    .reduce((acc, e) => acc + (e.bullets?.length || 0), 0);

  const matchedSkills: string[] = [];
  const tagOnlySkills: string[] = [];
  const missingSkills: string[] = [];
  const evidenceScoreByEntry = new Map<string, { label: string; hits: number }>();

  for (const rule of detectedRules) {
    let hasBulletEvidence = false;
    let hasTagMention = false;

    for (const item of entryRecords) {
      if (rule.pattern.test(item.bulletBlob)) {
        hasBulletEvidence = true;
        if (item.entry.entryType === "experience" || item.entry.entryType === "project") {
          const shortTitle = item.entry.title.split(/\s+[—–-]\s+/)[0].trim();
          const current = evidenceScoreByEntry.get(item.entry.id) || { label: shortTitle, hits: 0 };
          current.hits += 1;
          evidenceScoreByEntry.set(item.entry.id, current);
        }
      } else if (rule.pattern.test(item.tagBlob)) {
        hasTagMention = true;
      }
    }

    if (hasBulletEvidence) {
      matchedSkills.push(rule.canonical);
    } else if (hasTagMention) {
      tagOnlySkills.push(rule.canonical);
    } else {
      missingSkills.push(rule.canonical);
    }
  }

  const relevantEvidenceLabels = [...evidenceScoreByEntry.values()]
    .sort((a, b) => b.hits - a.hits)
    .map((v) => v.label)
    .slice(0, 3);

  const totalCriteria = matchedSkills.length + tagOnlySkills.length + missingSkills.length;
  const weightedHits = matchedSkills.length + tagOnlySkills.length * 0.45;
  const score =
    entries.length > 0 && totalCriteria > 0
      ? Math.min(98, Math.round((weightedHits / totalCriteria) * 100))
      : 0;

  let suitabilityVerdict = "Stretch Role · Review Core Requirements";
  if (score >= 72) suitabilityVerdict = "Strong Fit · High Relevance";
  else if (score >= 45) suitabilityVerdict = "Solid Alignment · Key Gaps Noted";

  const unclearPool = [...tagOnlySkills, ...missingSkills];
  let summaryInsight = "";
  if (entries.length === 0) {
    summaryInsight = "Add your experience or import a resume into your Career Vault first so we can check how your background fits this role.";
  } else if (totalCriteria === 0) {
    summaryInsight = "Paste a full job description with required skills and responsibilities for a more specific breakdown, or tailor a resume directly.";
  } else {
    const strengthTopics = formatReadableList(matchedSkills.slice(0, 3));
    const evidenceClause =
      relevantEvidenceLabels.length > 0
        ? ` (evidenced in ${formatReadableList(relevantEvidenceLabels)})`
        : "";

    const strengthSentence =
      matchedSkills.length > 0
        ? `Your ${strengthTopics} work${evidenceClause} looks relevant to this role.`
        : `None of the core role criteria have direct bullet-level proof in your Career Vault yet.`;

    let gapSentence = "";
    if (tagOnlySkills.length > 0 && missingSkills.length > 0) {
      gapSentence = ` Your experience with ${formatReadableList(tagOnlySkills.slice(0, 2))} isn't clear from your achievement bullets yet, and ${formatReadableList(missingSkills.slice(0, 2))} isn't in your Vault — worth bearing in mind.`;
    } else if (tagOnlySkills.length > 0) {
      gapSentence = ` Your experience with ${formatReadableList(tagOnlySkills.slice(0, 2))} only appears as a skill tag without supporting bullet work, so that's worth clarifying.`;
    } else if (missingSkills.length > 0) {
      gapSentence = ` Your experience with ${formatReadableList(missingSkills.slice(0, 2))} isn't clear from your Career Vault yet, so that's worth bearing in mind.`;
    } else {
      gapSentence = ` Every key requirement in this posting is backed by evidence in your Vault.`;
    }

    summaryInsight = `${strengthSentence}${gapSentence}`.trim();
  }

  return {
    extractedTitle,
    score,
    matchedSkills,
    tagOnlySkills,
    missingSkills: unclearPool,
    relevantEvidenceLabels,
    suitabilityVerdict,
    summaryInsight,
    totalFactsCount,
  };
}
