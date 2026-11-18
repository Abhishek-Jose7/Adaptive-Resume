import { z } from "zod";

export const MetricKindSchema = z.enum(["percent", "currency", "count", "duration", "scale"]);

export const FactTypeSchema = z.enum([
  "metric",
  "tool",
  "technology",
  "scope",
  "role",
  "outcome",
  "date",
  "other",
]);

export const VisibilitySchema = z.enum(["private", "resume", "public_eligible"]);

export const VerificationStatusSchema = z.enum([
  "unverified",
  "user_verified",
  "source_verified",
]);

export const BulletFactInputSchema = z.object({
  id: z.string().optional(),
  bulletId: z.string().nullable().optional(),
  entryId: z.string().nullable().optional(),
  factType: FactTypeSchema,
  factKey: z.string().min(1, "Key is required"),
  valueText: z.string().min(1, "Value text is required"),
  valueNumber: z.number().nullable().optional(),
  unit: z.string().nullable().optional(),
  currencyCode: z.string().nullable().optional(),
  metricKind: MetricKindSchema.nullable().optional(),
  sourceEvidenceId: z.string().nullable().optional(),
  verificationStatus: VerificationStatusSchema.default("unverified"),
});

export const AchievementBulletInputSchema = z.object({
  id: z.string().optional(),
  entryId: z.string().optional(),
  text: z.string().min(1, "Achievement bullet text cannot be empty"),
  normalizedText: z.string().optional(),
  visibility: VisibilitySchema.default("private"),
  verificationStatus: VerificationStatusSchema.default("unverified"),
  usagePolicy: z.enum(["eligible", "never_use", "exclude_from_job"]).default("eligible"),
  sortOrder: z.number().int().default(0),
  facts: z.array(BulletFactInputSchema).optional().default([]),
});

export const BankEntryInputSchema = z.object({
  id: z.string().optional(),
  entryType: z.enum([
    "profile",
    "experience",
    "education",
    "project",
    "skill_group",
    "certification",
    "award",
    "publication",
    "volunteer",
    "custom",
  ]),
  title: z.string().min(1, "Title is required"),
  organization: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  isCurrent: z.boolean().default(false),
  descriptionContext: z.string().nullable().optional(),
  visibility: VisibilitySchema.default("private"),
  verificationStatus: VerificationStatusSchema.default("unverified"),
  sortOrder: z.number().int().default(0),
  bullets: z.array(AchievementBulletInputSchema).optional().default([]),
});

export const BulkBankOperationSchema = z.object({
  action: z.enum(["reorder", "delete", "update_visibility"]),
  entryIds: z.array(z.string()).min(1),
  orderMap: z.record(z.number()).optional(), // entryId -> new sortOrder
  visibility: VisibilitySchema.optional(),
});
