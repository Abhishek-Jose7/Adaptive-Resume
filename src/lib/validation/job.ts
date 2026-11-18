import { z } from "zod";

export const SeniorityEnum = z.enum([
  "intern",
  "entry",
  "junior",
  "mid",
  "senior",
  "lead",
  "manager",
  "director",
  "executive",
  "unknown",
]);

export const WorkModeEnum = z.enum(["onsite", "hybrid", "remote", "unknown"]);

export const KeywordCategoryEnum = z.enum([
  "technical_skill",
  "tool",
  "domain",
  "responsibility",
  "soft_skill",
  "credential",
  "other",
]);

export const PriorityEnum = z.enum(["must_have", "nice_to_have"]);

export const UserOverrideEnum = z.enum(["none", "promoted", "demoted", "removed"]);

export const JDKeywordSchema = z.object({
  id: z.string(),
  canonical: z.string(),
  synonyms: z.array(z.string()).default([]),
  category: KeywordCategoryEnum,
  priority: PriorityEnum,
  importance: z.number().min(0).max(1),
  evidencePhrase: z.string().nullable().default(null),
  userOverride: UserOverrideEnum.default("none"),
});

export const JDResponsibilitySchema = z.object({
  id: z.string(),
  text: z.string(),
  priority: PriorityEnum,
  keywords: z.array(z.string()).default([]),
});

export const JDAnalysisSchema = z.object({
  schemaVersion: z.literal(1),
  role: z.object({
    title: z.string().nullable().default(null),
    company: z.string().nullable().default(null),
    seniority: SeniorityEnum.default("unknown"),
    domain: z.array(z.string()).default([]),
    location: z.string().nullable().default(null),
    workMode: WorkModeEnum.default("unknown"),
    yearsExperience: z
      .object({
        min: z.number().nullable().default(null),
        max: z.number().nullable().default(null),
      })
      .default({ min: null, max: null }),
    education: z.array(z.string()).default([]),
  }),
  keywords: z.array(JDKeywordSchema).default([]),
  responsibilities: z.array(JDResponsibilitySchema).default([]),
  constraints: z.array(z.string()).default([]),
  ambiguityFlags: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).default(0.8),
  sourceTextHash: z.string(),
  promptVersion: z.string().default("v1"),
});

export const CreateJobInputSchema = z.object({
  title: z.string().optional(),
  company: z.string().optional(),
  location: z.string().optional(),
  sourceUrl: z.string().url().optional().or(z.literal("")),
  rawText: z.string().min(10, "Job description text must be at least 10 characters"),
});

export type ValidatedJDAnalysis = z.infer<typeof JDAnalysisSchema>;
export type ValidatedJobInput = z.infer<typeof CreateJobInputSchema>;
