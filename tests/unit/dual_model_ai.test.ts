import { describe, it, expect, vi, beforeEach } from "vitest";
import { OpenRouterAdapter } from "@/lib/ai/adapters/openRouterAdapter";
import { GroqAdapter } from "@/lib/ai/adapters/groqAdapter";
import { ProviderFactory, isPrimaryUser, resolveGroqKeys } from "@/lib/ai/providerFactory";
import { AiResumeParserService } from "@/lib/ai/services/aiResumeParserService";
import { XyzRewriterService } from "@/lib/ai/services/xyzRewriterService";
import { TruthBoundValidator } from "@/lib/tailoring/truthBoundValidator";
import { AchievementBullet, StructuredFact } from "@/types/bank";
import { RewrittenBullet } from "@/types/job";

describe("Dual-Model AI Architecture (OpenRouter ling-3.2-flash:free)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. OpenRouter Provider Adapter & Configuration", () => {
    it("initializes with dedicated keys and models for parser vs reasoning pipelines", () => {
      const parser = new OpenRouterAdapter(
        "sk-test-parser-key",
        "inclusionai/ling-3.2-flash:free",
        "parser"
      );
      expect(parser.name).toBe("openrouter");
      expect(parser.getModel()).toBe("inclusionai/ling-3.2-flash:free");
      expect(parser.getRole()).toBe("parser");

      const reasoning = new OpenRouterAdapter(
        "sk-test-reasoning-key",
        "inclusionai/ling-3.2-flash:free",
        "reasoning"
      );
      expect(reasoning.name).toBe("openrouter");
      expect(reasoning.getModel()).toBe("inclusionai/ling-3.2-flash:free");
      expect(reasoning.getRole()).toBe("reasoning");
    });

    it("ProviderFactory instantiates dedicated parser and reasoning providers correctly", () => {
      process.env.OPENROUTER_API_KEY_PARSER = "sk-parser-123";
      process.env.OPENROUTER_MODEL_PARSER = "inclusionai/ling-3.2-flash:free";
      process.env.OPENROUTER_API_KEY_REASONING = "sk-reasoning-456";
      process.env.OPENROUTER_MODEL_REASONING = "inclusionai/ling-3.2-flash:free";

      const parser = ProviderFactory.getParserProvider();
      expect(parser.name).toBe("openrouter");

      const reasoning = ProviderFactory.getReasoningProvider();
      expect(reasoning.name).toBe("openrouter");
    });

    it("falls back to LocalDeterministicAdapter when keys are missing", () => {
      const origParserKey = process.env.OPENROUTER_API_KEY_PARSER;
      const origGenericKey = process.env.OPENROUTER_API_KEY;
      delete process.env.OPENROUTER_API_KEY_PARSER;
      delete process.env.OPENROUTER_API_KEY;

      const parser = ProviderFactory.getParserProvider();
      expect(parser.name).toBe("local-deterministic");

      process.env.OPENROUTER_API_KEY_PARSER = origParserKey;
      process.env.OPENROUTER_API_KEY = origGenericKey;
    });

    it("cleanAndParseJson extracts pure JSON from markdown fences and trims prose", () => {
      const markdownJson = "```json\n{\n  \"name\": \"Abhishek Roy Jose\",\n  \"skills\": {\"technical\": [\"TypeScript\", \"Python\"]}\n}\n```";
      const parsed = OpenRouterAdapter.cleanAndParseJson<{ name: string; skills: { technical: string[] } }>(markdownJson);
      expect(parsed.name).toBe("Abhishek Roy Jose");
      expect(parsed.skills.technical).toContain("TypeScript");

      const withPreamble = "Here is the extracted resume output:\n```\n{\"degree\": \"B.E.\"}\n```\nHope this helps!";
      const parsedPreamble = OpenRouterAdapter.cleanAndParseJson<{ degree: string }>(withPreamble);
      expect(parsedPreamble.degree).toBe("B.E.");
    });

    it("cleanAndParseJson safely repairs minor trailing commas", () => {
      const trailingCommaJson = '{"items": ["Node.js", "PostgreSQL", ], "count": 2, }';
      const parsed = OpenRouterAdapter.cleanAndParseJson<{ items: string[]; count: number }>(trailingCommaJson);
      expect(parsed.items).toHaveLength(2);
      expect(parsed.count).toBe(2);
    });

    it("handles rate limiting (429) with exponential retry backoff", async () => {
      const adapter = new OpenRouterAdapter("sk-test-key", "inclusionai/ling-3.2-flash:free", "parser");

      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return new Response(JSON.stringify({ error: "rate limited" }), {
            status: 429,
            headers: { "retry-after": "0.1" },
          });
        }
        return new Response(
          JSON.stringify({
            choices: [{ message: { content: '{"name": "Verified User"}' } }],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          }),
          { status: 200 }
        );
      });

      const res = await adapter.generateStructured<{ name: string }>({
        task: "parse_resume",
        systemPrompt: "test",
        userPayload: {},
        schema: {},
        maxOutputTokens: 100,
        temperature: 0.1,
      });

      expect(callCount).toBe(2);
      expect(res.data.name).toBe("Verified User");
    });
  });

  describe("2. Pipeline A: Dedicated Resume Parser (Text & Vision)", () => {
    it("extracts text-based resumes locally without calling external AI", async () => {
      const rawResumeText = `
ABHISHEK ROY JOSE
Email: abhishek@example.com | Phone: +91 9876543210 | Location: Mumbai, India

PROFESSIONAL SUMMARY
Computer Engineering student experienced in full-stack development, LLMs, and backend architectures.

TECHNICAL SKILLS
Languages: Python, TypeScript, SQL
Frameworks: React, Next.js, Node.js

WORK EXPERIENCE
Software Engineering Intern | TechCorp Inc
June 2024 - August 2024
• Built automated data synchronization pipeline using Next.js and PostgreSQL.
• Optimized query performance by 40% across 5 core database tables.

EDUCATION
B.E. in Computer Engineering | Mumbai University
2022 - 2026
CGPA: 9.4
      `.trim();

      const result = await AiResumeParserService.parseFromText(rawResumeText, "Test Resume", { forceLocal: true });

      expect(result.parserModel).toBe("local-deterministic");
      expect(result.isVision).toBe(false);
      expect(result.stagedItems.length).toBeGreaterThan(0);

      const expItem = result.stagedItems.find((i) => i.entryType === "experience");
      expect(expItem).toBeDefined();
      expect(expItem?.parsedDataJson.organization).toBe("TechCorp Inc");

      const eduItem = result.stagedItems.find((i) => i.entryType === "education");
      expect(eduItem).toBeDefined();
    });

    it("preserves missing fields as null and never hallucinates absent metrics or dates", () => {
      const incompleteJson = {
        name: "Abhishek",
        summary: "Developer",
        education: [
          {
            institution: "Tech Institute",
            // grades, startDate, location missing
          },
        ],
        experience: [
          {
            role: "Frontend Engineer",
            organization: "Startup",
            // dates missing, metrics absent
            bullets: ["Designed landing page components."],
          },
        ],
        skills: {
          technical: ["JavaScript", "CSS"],
        },
      };

      const sanitized: any = AiResumeParserService.sanitizeNormalizedJson(incompleteJson);

      expect(sanitized.education[0].grades).toBeNull();
      expect(sanitized.education[0].startDate).toBeNull();
      expect(sanitized.education[0].location).toBeNull();
      expect(sanitized.experience[0].startDate).toBeNull();
      expect(sanitized.experience[0].endDate).toBeNull();
      expect(sanitized.experience[0].bullets).toEqual(["Designed landing page components."]);
    });

    it("captures ambiguous or unreadable information in ambiguousOrFlagged", () => {
      const dataWithAmbiguity = {
        name: "Abhishek",
        education: [],
        experience: [],
        skills: { technical: ["React"], soft: [] },
        ambiguousOrFlagged: [
          {
            field: "experience.dates",
            snippet: "June 2023 - ???",
            reason: "Unclear graduation or ending date on document scan",
          },
        ],
      };

      const sanitized: any = AiResumeParserService.sanitizeNormalizedJson(dataWithAmbiguity);
      expect(sanitized.ambiguousOrFlagged).toHaveLength(1);
      expect(sanitized.ambiguousOrFlagged[0].field).toBe("experience.dates");
      expect(sanitized.ambiguousOrFlagged[0].reason).toContain("Unclear graduation");
    });

    it("routes scanned documents and images through multimodal vision inference", async () => {
      const mockVisionResponse = {
        name: "Abhishek Roy Jose",
        contact: { email: "abhishek@example.com", phone: "+91 9999999999", location: "Mumbai", links: [] },
        summary: "AI & Full-stack engineer",
        education: [{ institution: "CRCE", degree: "B.E.", grades: "9.2" }],
        experience: [{ role: "Technical Lead", organization: "GDSC", bullets: ["Organized Bit n Build hackathon with 1000+ participants."] }],
        skills: { technical: ["Next.js", "Python"], soft: ["Leadership"] },
        certifications: [],
        achievements: ["1st place in National Hackathon"],
        positionsOfResponsibility: [{ title: "Technical Associate", organization: "GDSC CRCE", duration: "2024-2025" }],
      };

      global.fetch = vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: JSON.stringify(mockVisionResponse) } }],
            usage: { prompt_tokens: 50, completion_tokens: 100, total_tokens: 150 },
          }),
          { status: 200 }
        )
      );

      const fakeBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
      const result = await AiResumeParserService.parseFromVisionImage(
        fakeBase64,
        "image/png",
        "Scanned Resume Test",
        { apiKey: "sk-test-vision-key" }
      );

      expect(result.isVision).toBe(true);
      expect(result.normalized.name).toBe("Abhishek Roy Jose");
      expect((result.normalized.education as any)[0].institution).toBe("CRCE");
      expect(result.stagedItems.length).toBeGreaterThan(0);
    });
  });

  describe("3. Pipeline B: Google XYZ Achievement Rewriter & Anti-Fabrication", () => {
    it("rewrites bullet with verified metrics into Google XYZ structure (Accomplished X, measured by Y, by doing Z)", async () => {
      const sourceBullet: any = {
        id: "bul_1",
        text: "Reduced average API response time by 35% by optimizing database queries and implementing Redis caching.",
        facts: [
          {
            id: "f_1",
            bulletId: "bul_1",
            factType: "metric" as const,
            factKey: "latency_reduction",
            valueText: "35%",
            valueNumeric: 35,
          },
        ],
      };

      const parentEntry = {
        id: "ent_1",
        title: "Backend Engineer",
        organization: "TechCorp",
      };

      const result = await XyzRewriterService.rewriteBullet(
        sourceBullet,
        parentEntry,
        sourceBullet.facts,
        ["Redis", "PostgreSQL"],
        { forceLocal: true }
      );

      expect(result.hasVerifiedMetric).toBe(true);
      expect(result.passedValidation).toBe(true);
      expect(result.rewrittenText).toContain("35%");
      expect(result.suggestedMetricQuestion).toBeNull();
    });

    it("rewrites bullet without metrics HONESTLY without fabricating numbers, and suggests a metric question", async () => {
      const sourceBullet = {
        id: "bul_2",
        text: "Worked on backend APIs for a web application to support user data synchronization.",
      };

      const parentEntry = {
        id: "ent_2",
        title: "Software Engineer",
        organization: "Startup",
      };

      const result = await XyzRewriterService.rewriteBullet(
        sourceBullet,
        parentEntry,
        [],
        ["API", "Backend"],
        { forceLocal: true }
      );

      expect(result.hasVerifiedMetric).toBe(false);
      expect(result.passedValidation).toBe(true);
      // Confirms passive "worked on" was upgraded to active verb
      expect(result.rewrittenText).not.toMatch(/^worked on/i);
      // Confirms NO hallucinated numbers or percentages were invented
      expect(result.rewrittenText).not.toMatch(/\b\d+%\b/);
      expect(result.rewrittenText).not.toMatch(/\$\d+/);
      // Confirms metric prompt was generated as a suggestion for user confirmation
      expect(result.suggestedMetricQuestion).toBeTruthy();
      expect(result.suggestedMetricQuestion).toContain("latency");
    });

    it("rejects hallucinated metrics and strips ungrounded numbers from LLM output", async () => {
      const sourceBullet = {
        id: "bul_3",
        text: "Built user authentication service using JWT and OAuth.",
      };

      const parentEntry = {
        id: "ent_3",
        title: "Backend Engineer",
      };

      // Simulate an LLM that hallucinates an unverified metric ("improving speed by 50%")
      global.fetch = vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    rewrittenText: "Architected user authentication service using JWT and OAuth, accelerating throughput by 50%.",
                    accomplishedX: "Accelerated throughput",
                    measuredByY: "50%",
                    byDoingZ: "OAuth & JWT",
                    suggestedMetricQuestion: null,
                    claimMap: [{ claim: "throughput 50%", evidenceIds: ["bul_3"], claimType: "metric" }],
                  }),
                },
              },
            ],
            usage: { prompt_tokens: 20, completion_tokens: 30, total_tokens: 50 },
          }),
          { status: 200 }
        )
      );

      const result = await XyzRewriterService.rewriteBullet(
        sourceBullet,
        parentEntry,
        [],
        ["Auth"],
        { apiKey: "sk-test-reasoning" }
      );

      // Verifies that the hallucinated 50% was rejected and stripped!
      expect(result.passedValidation).toBe(false);
      expect(result.validationNotes[0]).toContain("Hallucinated metric rejected");
      expect(result.rewrittenText).not.toContain("50%");
    });

    it("TruthBoundValidator strictly forbids unverified numeric figures", () => {
      const candidateRewrite: RewrittenBullet = {
        text: "Boosted system performance by 45% through database optimization.",
        sourceBulletIds: ["b_orig"],
        sourceFactIds: [],
        claimMap: [{ claim: "45% performance", evidenceIds: ["b_orig"], claimType: "metric" }],
        validatorStatus: "not_applicable",
      };

      const sourceBullets: AchievementBullet[] = [
        {
          id: "b_orig",
          entryId: "entry_1",
          userId: "usr_1",
          text: "Optimized database queries for the user reporting service.",
          verificationStatus: "user_verified",
          usagePolicy: "eligible",
          visibility: "private",
          sortOrder: 0,
          rowVersion: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          facts: [],
        },
      ];

      const validation = TruthBoundValidator.validate(candidateRewrite, sourceBullets, [], [], "entry_1");

      expect(validation.isValid).toBe(false);
      const numericFail = validation.failures.find((f) => f.rule === "NUMERIC_MUTATION");
      expect(numericFail).toBeDefined();
      expect(numericFail?.message).toContain("45");
    });
  });

  describe("5. Groq Dual-Key Rotation, VIP User Routing & Rate-Limit Failover", () => {
    const primaryKey = "gsk_primary_key_11111111111111111111111111111111111111111";
    const fallbackKey = "gsk_fallback_key_2222222222222222222222222222222222222222";

    beforeEach(() => {
      process.env.GROQ_API_KEY = primaryKey;
      process.env.GROQ_API_KEY_FALLBACK = fallbackKey;
    });

    it("isPrimaryUser correctly identifies Abhishek and Scarlett as primary users", () => {
      expect(isPrimaryUser("abhishekjose780@gmail.com")).toBe(true);
      expect(isPrimaryUser("scarlettmenezes29@gmail.com")).toBe(true);
      expect(isPrimaryUser("ABHISHEKJOSE780@GMAIL.COM")).toBe(true);
      expect(isPrimaryUser("ScarlettMenezes29@GMAIL.COM")).toBe(true);
      expect(isPrimaryUser("guest.user@example.com")).toBe(false);
      expect(isPrimaryUser("random_developer@gmail.com")).toBe(false);
    });

    it("resolveGroqKeys gives primary users Key 1 with Key 2 fallback", () => {
      const keys = resolveGroqKeys(undefined, "abhishekjose780@gmail.com");
      expect(keys.primaryKey).toBe(primaryKey);
      expect(keys.fallbackKey).toBe(fallbackKey);

      const scarlettKeys = resolveGroqKeys(undefined, "scarlettmenezes29@gmail.com");
      expect(scarlettKeys.primaryKey).toBe(primaryKey);
      expect(scarlettKeys.fallbackKey).toBe(fallbackKey);
    });

    it("resolveGroqKeys routes normal users to Key 2 first and falls back to Key 1 only if Key 2 is exhausted", () => {
      const keys = resolveGroqKeys(undefined, "guest_applicant@company.org");
      expect(keys.primaryKey).toBe(fallbackKey);
      expect(keys.fallbackKey).toBe(primaryKey);
    });

    it("GroqAdapter immediately rotates to fallback key on HTTP 429", async () => {
      const adapter = new GroqAdapter({
        apiKey: primaryKey,
        fallbackApiKey: fallbackKey,
        model: "qwen/qwen3.8-27b",
      });

      let requestedKeys: string[] = [];
      global.fetch = vi.fn().mockImplementation(async (_url, opts) => {
        const authHeader = (opts?.headers as Record<string, string>)?.Authorization;
        const usedKey = authHeader?.replace("Bearer ", "");
        if (usedKey) requestedKeys.push(usedKey);

        if (requestedKeys.length === 1) {
          // First attempt with primary key returns 429
          return new Response(JSON.stringify({ error: { message: "Rate limit exceeded", code: "rate_limit_exceeded" } }), {
            status: 429,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Second attempt with fallback key succeeds
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({ success: true, message: "Rotated cleanly to Key 2" }),
                },
              },
            ],
            usage: { prompt_tokens: 20, completion_tokens: 15, total_tokens: 35 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      });

      const res = await adapter.generateStructured<{ success: boolean; message: string }>({
        task: "rewrite",
        systemPrompt: "system",
        userPayload: { test: true },
        schema: {},
        maxOutputTokens: 256,
        temperature: 0.1,
      });

      expect(requestedKeys[0]).toBe(primaryKey);
      expect(requestedKeys[1]).toBe(fallbackKey);
      expect(res.data.success).toBe(true);
      expect(res.data.message).toBe("Rotated cleanly to Key 2");
    });

    it("GroqAdapter automatically recovers from 404 model not found to qwen/qwen3.8-27b", async () => {
      const adapter = new GroqAdapter({
        apiKey: primaryKey,
        fallbackApiKey: fallbackKey,
        model: "openai/gpt-oss-120b",
      });

      let requestedModels: string[] = [];
      global.fetch = vi.fn().mockImplementation(async (_url, opts) => {
        const body = JSON.parse(opts?.body as string);
        requestedModels.push(body.model);

        if (requestedModels.length === 1) {
          return new Response(JSON.stringify({ error: { code: "model_not_found" } }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({ recovered: true }),
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      });

      const res = await adapter.generateStructured<{ recovered: boolean }>({
        task: "rewrite",
        systemPrompt: "system",
        userPayload: { test: true },
        schema: {},
        maxOutputTokens: 256,
        temperature: 0.1,
      });

      expect(requestedModels[0]).toBe("openai/gpt-oss-120b");
      expect(requestedModels[1]).toBe("qwen/qwen3.8-27b");
      expect(res.data.recovered).toBe(true);
    });

    it("GroqAdapter safely falls back to local deterministic engine if all attempts fail", async () => {
      const adapter = new GroqAdapter({
        apiKey: primaryKey,
        fallbackApiKey: fallbackKey,
        model: "qwen/qwen3.8-27b",
      });

      global.fetch = vi.fn().mockImplementation(async () => {
        return new Response(JSON.stringify({ error: { message: "Persistent rate limit" } }), {
          status: 429,
          headers: { "Content-Type": "application/json" },
        });
      });

      // Should NEVER throw, should gracefully return deterministic structure
      const res = await adapter.generateStructured<{ text: string }>({
        task: "rewrite",
        systemPrompt: "system",
        userPayload: { sourceBullet: { text: "Managed critical systems" } },
        schema: {},
        maxOutputTokens: 256,
        temperature: 0.1,
      });

      expect(res).toBeDefined();
      expect(res.model).toBe("deterministic-v1");
    }, 15000);

    it("GroqAdapter cascades to OpenRouter before local deterministic fallback when Groq is exhausted", async () => {
      const adapter = new GroqAdapter({
        apiKey: primaryKey,
        fallbackApiKey: fallbackKey,
        model: "qwen/qwen3.8-27b",
      });

      let calledEndpoints: string[] = [];
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        calledEndpoints.push(url);
        if (url.includes("groq.com")) {
          return new Response(JSON.stringify({ error: { message: "Groq exhausted" } }), {
            status: 429,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (url.includes("openrouter.ai")) {
          return new Response(
            JSON.stringify({
              choices: [{ message: { content: JSON.stringify({ cascadedToOpenRouter: true }) } }],
              usage: { prompt_tokens: 15, completion_tokens: 10, total_tokens: 25 },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        return new Response(JSON.stringify({ error: "unknown" }), { status: 500 });
      });

      const res = await adapter.generateStructured<{ cascadedToOpenRouter: boolean }>({
        task: "rewrite",
        systemPrompt: "system",
        userPayload: { test: true },
        schema: {},
        maxOutputTokens: 256,
        temperature: 0.1,
      });

      expect(calledEndpoints.some((u) => u.includes("groq.com"))).toBe(true);
      expect(calledEndpoints.some((u) => u.includes("openrouter.ai"))).toBe(true);
      expect(res.data.cascadedToOpenRouter).toBe(true);
    }, 15000);
  });
});

