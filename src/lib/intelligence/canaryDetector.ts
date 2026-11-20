import crypto from "crypto";

export interface CanaryTrapAlert {
  id: string;
  keyword: string;
  contextSentence: string;
  trapType:
    | "fake_programming_language"
    | "fake_tool_or_framework"
    | "absurd_requirement"
    | "suspicious_honeypot"
    | "prompt_injection_directive";
  severity: "critical" | "warning";
  explanation: string;
  recommendation: string;
}

export interface CanaryDetectionResult {
  hasCanaryTrap: boolean;
  canaryTraps: CanaryTrapAlert[];
  quarantinedKeywords: string[];
  summaryMessage: string;
}

// 1. Verified Taxonomy of standard programming languages (lowercase)
const KNOWN_PROGRAMMING_LANGUAGES = new Set([
  "python",
  "javascript",
  "typescript",
  "java",
  "c",
  "c++",
  "cpp",
  "c#",
  "csharp",
  "go",
  "golang",
  "rust",
  "ruby",
  "php",
  "swift",
  "kotlin",
  "dart",
  "scala",
  "r",
  "julia",
  "elixir",
  "erlang",
  "haskell",
  "clojure",
  "ocaml",
  "f#",
  "lua",
  "perl",
  "bash",
  "shell",
  "zsh",
  "powershell",
  "sql",
  "assembly",
  "vba",
  "fortran",
  "cobol",
  "ada",
  "pascal",
  "lisp",
  "prolog",
  "scheme",
  "groovy",
  "matlab",
  "solidity",
  "zig",
  "nim",
  "mojo",
  "visual basic",
  "html",
  "css",
  "sass",
  "less",
  "graphql",
]);

// 2. Verified Databases and Storage Engines
const KNOWN_DATABASES = new Set([
  "postgresql",
  "postgres",
  "mysql",
  "sqlite",
  "mongodb",
  "redis",
  "cassandra",
  "dynamodb",
  "couchdb",
  "mariadb",
  "oracle",
  "mssql",
  "sql server",
  "neo4j",
  "elasticsearch",
  "opensearch",
  "clickhouse",
  "snowflake",
  "bigquery",
  "redshift",
  "d1",
  "firestore",
]);

// 3. Known Non-Technical Decoy Words (Card/Board games, sports, food, parlor games, fictional words)
const KNOWN_DECOY_OR_TRAP_WORDS = new Set([
  "cribbage",
  "monopoly",
  "poker",
  "canasta",
  "pinochle",
  "scrabble",
  "backgammon",
  "yahtzee",
  "baccarat",
  "roulette",
  "blackjack",
  "bridge",
  "checkers",
  "chess",
  "clue",
  "battleship",
  "catan",
  "twister",
  "jenga",
  "uno",
  "mahjong",
  "dominoes",
  "crokinole",
  "flanagandb",
  "bananascript",
  "fluxcapacitor",
  "hyperionmesh",
  "kryptonlang",
  "cloudnimbus9",
]);

// 4. Technology Release Years (to detect impossible / absurd experience requirements)
// Current reference year: 2026
const TECH_RELEASE_YEARS: Record<string, number> = {
  react: 2013,
  "react.js": 2013,
  reactjs: 2013,
  rust: 2015,
  kubernetes: 2014,
  k8s: 2014,
  flutter: 2017,
  "next.js": 2016,
  nextjs: 2016,
  fastapi: 2018,
  swift: 2014,
  kotlin: 2016,
  typescript: 2012,
  langchain: 2022,
  chatgpt: 2022,
  openai: 2020,
  "generative ai": 2020,
  genai: 2020,
  svelte: 2016,
  tailwind: 2017,
  "tailwind css": 2017,
  docker: 2013,
  deno: 2018,
  bun: 2022,
  prisma: 2019,
};

export class CanaryDetector {
  /**
   * Scans a Job Description for recruiter canary traps, honey-pot keywords,
   * impossible timeline demands, and secret prompt directives.
   */
  static detectCanaryTraps(rawText: string): CanaryDetectionResult {
    const canaryTraps: CanaryTrapAlert[] = [];
    const quarantinedKeywords = new Set<string>();

    if (!rawText || typeof rawText !== "string") {
      return {
        hasCanaryTrap: false,
        canaryTraps: [],
        quarantinedKeywords: [],
        summaryMessage: "No job description text provided.",
      };
    }

    const sentences = rawText.split(/(?<=[.!?\n])\s+/);

    // Rule A: Syntactic List Traps ("proficiency with Python, Java, and Cribbage programming languages")
    const listPatterns = [
      /(?:proficiency\s+(?:with|in)|experience\s+(?:with|in)|familiarity\s+with|knowledge\s+of|skills?\s+in|using|skilled\s+in|proficient\s+in)\s+([^.\n]+?)\s+(?:programming\s+languages?|frameworks?|libraries|tools?|databases?|technologies)\b/gi,
      /(?:required|preferred|must have|strong)\s+proficiency\s+in\s+([^.\n]+?)\s+(?:programming\s+languages?|frameworks?|databases?)\b/gi,
      /(?:programming\s+languages?|databases?|frameworks?)\s*:\s*([^.\n]+)/gi,
      /\b(?:in|with)\s+([A-Za-z0-9+#.-]+(?:\s*,\s*[A-Za-z0-9+#.-]+)*\s+(?:and|or)\s+[A-Za-z0-9+#.-]+)\s+(?:programming\s+languages?|frameworks?|databases?)\b/gi,
    ];

    for (const pattern of listPatterns) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(rawText)) !== null) {
        const fullMatch = match[0];
        const itemsSegment = match[1];
        if (!itemsSegment) continue;

        const isClaimedAsLang = /programming\s+languages?/i.test(fullMatch);
        const isClaimedAsDb = /databases?/i.test(fullMatch);

        // Split items by comma, "and", "or", including Oxford comma pairs like ", and"
        const rawItems = itemsSegment
          .split(/(?:,\s*(?:and|or)\s*|,\s*|\s+and\s+|\s+or\s+)/i)
          .map((s) => s.trim().replace(/^['"]|['"]$/g, "").replace(/^(?:and|or)\s+/i, ""))
          .filter((s) => s.length > 1 && !/^(and|or|etc|such as|including|with|in)$/i.test(s));

        for (const item of rawItems) {
          const lower = item.toLowerCase();

          // Check if item is a known decoy word (e.g. "cribbage")
          if (KNOWN_DECOY_OR_TRAP_WORDS.has(lower)) {
            quarantinedKeywords.add(lower);
            if (!canaryTraps.some((t) => t.keyword.toLowerCase() === lower)) {
              canaryTraps.push({
                id: `canary_${crypto.randomUUID().slice(0, 8)}`,
                keyword: item,
                contextSentence: fullMatch,
                trapType: isClaimedAsLang ? "fake_programming_language" : "suspicious_honeypot",
                severity: "critical",
                explanation: `"${item}" is a known non-technical decoy word (card/board game or known trap) claimed as a technical requirement. Recruiters intentionally plant this in job descriptions to detect and automatically eliminate AI-generated resumes.`,
                recommendation: `DO NOT add "${item}" to your resume or cover letter. Including this keyword will trigger automated ATS rejection.`,
              });
            }
          }
          // If explicitly claimed as a programming language but not in language taxonomy
          else if (isClaimedAsLang && !KNOWN_PROGRAMMING_LANGUAGES.has(lower)) {
            // Exclude common generic qualifiers like "functional", "object-oriented", "scripting"
            if (!/^(functional|procedural|object-oriented|scripting|compiled|interpreted|backend|frontend)$/i.test(lower)) {
              quarantinedKeywords.add(lower);
              if (!canaryTraps.some((t) => t.keyword.toLowerCase() === lower)) {
                canaryTraps.push({
                  id: `canary_${crypto.randomUUID().slice(0, 8)}`,
                  keyword: item,
                  contextSentence: fullMatch,
                  trapType: "fake_programming_language",
                  severity: "critical",
                  explanation: `"${item}" is specified as a "programming language" in the job description, but is not recognized in any standard technical taxonomy. This is highly indicative of an ATS recruiter honey-pot trap.`,
                  recommendation: `Quarantined by Truth-Bound Guard. This term will be prevented from being added to your resume.`,
                });
              }
            }
          }
          // If explicitly claimed as a database but not in database taxonomy
          else if (isClaimedAsDb && !KNOWN_DATABASES.has(lower) && !KNOWN_PROGRAMMING_LANGUAGES.has(lower)) {
            if (!/^(relational|nosql|document|graph|key-value|distributed)$/i.test(lower)) {
              quarantinedKeywords.add(lower);
              if (!canaryTraps.some((t) => t.keyword.toLowerCase() === lower)) {
                canaryTraps.push({
                  id: `canary_${crypto.randomUUID().slice(0, 8)}`,
                  keyword: item,
                  contextSentence: fullMatch,
                  trapType: "fake_tool_or_framework",
                  severity: "critical",
                  explanation: `"${item}" is specified as a "database" in the job description, but is not recognized in standard database registries.`,
                  recommendation: `Quarantined by Truth-Bound Guard.`,
                });
              }
            }
          }
        }
      }
    }

    // Rule B: Known Decoy Words anywhere in JD if matched as standalone tokens
    for (const decoy of KNOWN_DECOY_OR_TRAP_WORDS) {
      const regex = new RegExp(`\\b${decoy}\\b`, "i");
      const match = rawText.match(regex);
      if (match) {
        quarantinedKeywords.add(decoy);
        if (!canaryTraps.some((t) => t.keyword.toLowerCase() === decoy)) {
          // Find context sentence
          const sentence = sentences.find((s) => regex.test(s)) || match[0];
          canaryTraps.push({
            id: `canary_${crypto.randomUUID().slice(0, 8)}`,
            keyword: match[0],
            contextSentence: sentence.trim(),
            trapType: "suspicious_honeypot",
            severity: "critical",
            explanation: `"${match[0]}" is a known decoy keyword. Recruiters plant this term in job descriptions to catch AI models that blindly regurgitate keywords.`,
            recommendation: `Under no circumstances should "${match[0]}" appear in your resume. It has been quarantined.`,
          });
        }
      }
    }

    // Rule C: Impossible / Absurd Experience Timeline Traps ("15+ years of Flutter / React / Rust")
    const yoeRegex = /(\d+)\+?\s*years(?:\s+of)?(?:\s+(?:experience|proficiency)\s+(?:in|with))?\s+([A-Za-z0-9.+#]+)/gi;
    let yoeMatch: RegExpExecArray | null;
    const currentYear = 2026;

    while ((yoeMatch = yoeRegex.exec(rawText)) !== null) {
      const demandedYears = parseInt(yoeMatch[1], 10);
      const techCandidate = yoeMatch[2].toLowerCase();
      const releaseYear = TECH_RELEASE_YEARS[techCandidate];

      if (releaseYear) {
        const maxPossibleYears = currentYear - releaseYear;
        if (demandedYears > maxPossibleYears + 1) {
          const sentence = sentences.find((s) => s.includes(yoeMatch![0])) || yoeMatch[0];
          canaryTraps.push({
            id: `canary_${crypto.randomUUID().slice(0, 8)}`,
            keyword: `${demandedYears}+ years of ${yoeMatch[2]}`,
            contextSentence: sentence.trim(),
            trapType: "absurd_requirement",
            severity: "warning",
            explanation: `The job description demands ${demandedYears}+ years of ${yoeMatch[2]}, but ${yoeMatch[2]} was only released in ${releaseYear} (maximum ${maxPossibleYears} years ago in 2026). This is an impossible requirement intentionally used to catch AI exaggeration.`,
            recommendation: `Do not claim ${demandedYears}+ years of experience with ${yoeMatch[2]}. State only your genuine, truthful experience.`,
          });
        }
      }
    }

    // Rule D: Secret Prompt Injection / Covert Keyword Insertion Directives
    const promptInjectionRegex =
      /(?:include|insert|mention|add)\s+(?:the\s+word\s+)?["']?([a-zA-Z0-9_-]+)["']?\s+(?:in|on)\s+(?:your\s+)?(?:resume|cover\s+letter|application|summary)|(?:ignore|disregard)\s+(?:all\s+)?(?:previous|prior)\s+instructions/gi;
    let piMatch: RegExpExecArray | null;
    while ((piMatch = promptInjectionRegex.exec(rawText)) !== null) {
      const trappedWord = piMatch[1] || piMatch[0];
      if (trappedWord && trappedWord.length > 2) {
        quarantinedKeywords.add(trappedWord.toLowerCase());
      }
      canaryTraps.push({
        id: `canary_${crypto.randomUUID().slice(0, 8)}`,
        keyword: trappedWord,
        contextSentence: piMatch[0],
        trapType: "prompt_injection_directive",
        severity: "critical",
        explanation: `Detected a prompt injection or covert recruiter instruction: "${piMatch[0]}". Recruiters use this to identify automated AI applicant tools.`,
        recommendation: `This directive has been isolated. Do not blindly follow automated prompt instructions from external job text.`,
      });
    }

    const hasCanaryTrap = canaryTraps.length > 0;
    const quarantinedList = Array.from(quarantinedKeywords);

    const summaryMessage = hasCanaryTrap
      ? `🛡️ Canary Shield Alert: Detected ${canaryTraps.length} potential recruiter honey-pot trap(s) in this job description (${quarantinedList.join(", ")}). These keywords are strictly quarantined to protect your resume from automated ATS disqualification.`
      : `🛡️ Canary Shield: Clean. No suspicious recruiter honey-pot traps or impossible timeline demands detected.`;

    return {
      hasCanaryTrap,
      canaryTraps,
      quarantinedKeywords: quarantinedList,
      summaryMessage,
    };
  }

  /**
   * Helper to check if a specific word or phrase is quarantined
   */
  static isQuarantined(word: string, quarantinedList: string[]): boolean {
    if (!word || !quarantinedList || quarantinedList.length === 0) return false;
    const lower = word.toLowerCase().trim();
    return quarantinedList.some((q) => {
      const qLower = q.toLowerCase().trim();
      return lower === qLower || new RegExp(`\\b${qLower}\\b`, "i").test(lower);
    });
  }
}
