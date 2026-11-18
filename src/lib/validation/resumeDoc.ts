import { z } from "zod";

export const ResumeBulletSchema = z.object({
  id: z.string(),
  text: z.string().min(1, "Bullet text is required"),
  provenance: z.enum(["bank", "ai-rewrite", "manual"]),
  sourceBulletIds: z.array(z.string()).default([]),
  sourceFactIds: z.array(z.string()).default([]),
  validatorStatus: z.enum(["passed", "not_applicable", "rejected"]).default("not_applicable"),
  pinned: z.boolean().optional().default(false),
});

export const ResumeItemSchema = z.object({
  id: z.string(),
  sourceEntryId: z.string().optional(),
  sourceBulletIds: z.array(z.string()).default([]),
  title: z.string().optional(),
  organization: z.string().optional(),
  dates: z
    .object({
      start: z.string().optional(),
      end: z.string().optional(),
      current: z.boolean().optional(),
    })
    .optional(),
  location: z.string().optional(),
  bullets: z.array(ResumeBulletSchema).default([]),
});

export const ResumeSectionSchema = z.object({
  id: z.string(),
  type: z.string(),
  heading: z.string().min(1, "Heading is required"),
  visible: z.boolean().default(true),
  items: z.array(ResumeItemSchema).default([]),
});

export const ResumeProfileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  headline: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  location: z.string().optional(),
  links: z
    .array(
      z.object({
        label: z.string(),
        url: z.string().url().or(z.string()),
      })
    )
    .default([]),
});

export const ResumeTemplateSchema = z.object({
  id: z.string(),
  version: z.string().default("1.0"),
  theme: z.record(z.unknown()).default({}),
});

export const ResumePageSchema = z.object({
  size: z.enum(["A4", "LETTER"]).default("A4"),
  targetPages: z.number().int().min(1).max(5).default(1),
});

export const ResumeMetadataSchema = z.object({
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  jdHash: z.string().optional(),
  promptVersion: z.string().optional(),
});

export const ResumeDocSchema = z.object({
  schemaVersion: z.literal(1),
  documentId: z.string(),
  versionId: z.string(),
  jobId: z.string().optional(),
  profile: ResumeProfileSchema,
  sections: z.array(ResumeSectionSchema),
  template: ResumeTemplateSchema,
  page: ResumePageSchema,
  metadata: ResumeMetadataSchema,
});

export type ValidatedResumeDoc = z.infer<typeof ResumeDocSchema>;
