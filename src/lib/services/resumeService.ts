import { db } from "../db/client";
import {
  resumeDocuments,
  resumeVersions,
  jobs,
  jdAnalyses,
  users,
  bankEntries,
  achievementBullets,
} from "../db/schema";
import { eq, and, desc, asc, sql, isNull } from "drizzle-orm";
import { ResumeDoc } from "@/types/resume";
import { createHash } from "crypto";
import { PlainTextSerializer } from "../export/plainTextSerializer";
import { DocxGenerator } from "../export/docxGenerator";
import { UsageLimitService } from "./usageLimitService";
import { SettingsService } from "./settingsService";
import { BulletRetriever } from "../tailoring/bulletRetriever";
import {
  extractProfileSummaryFromEntries,
  normalizeDistinctAwardIssuer,
  selectExperienceBulletsForRole,
  selectProjectAnglePoints,
  sortProjectsByConfidenceAndRelevance,
} from "../tailoring/projectAngleSelector";
import { compareReverseChronological, sortResumeDocChronologically } from "../utils/resumeOrderUtils";
import { budgetResumeForOnePageA4 } from "../editor/onePageA4Budgeter";
import { JDAnalysis } from "@/types/job";
import { BankEntry, AchievementBullet } from "@/types/bank";

export class ResumeService {
  /**
   * Lists all resume documents for a user
   */
  static async listResumes(userId: string) {
    return await db
      .select()
      .from(resumeDocuments)
      .where(eq(resumeDocuments.userId, userId))
      .orderBy(desc(resumeDocuments.updatedAt));
  }

  /**
   * Retrieves a resume document along with its latest working version
   */
  static async getResume(userId: string, resumeId: string) {
    const docs = await db
      .select()
      .from(resumeDocuments)
      .where(and(eq(resumeDocuments.userId, userId), eq(resumeDocuments.id, resumeId)))
      .limit(1);

    if (docs.length === 0) return null;

    const doc = docs[0];

    const versions = await db
      .select()
      .from(resumeVersions)
      .where(and(eq(resumeVersions.userId, userId), eq(resumeVersions.resumeDocumentId, resumeId)))
      .orderBy(desc(resumeVersions.versionNumber))
      .limit(1);

    const latestVersion = versions.length > 0 ? versions[0] : null;

    return {
      document: doc,
      latestVersion,
    };
  }

  /**
   * Assembles a role-tailored, reverse-chronological, Vault-ordered one-page starter doc
   * whenever createResume is called without an explicit initialDoc (e.g. from /jobs/[id]).
   */
  static async assembleInitialDocFromVault(userId: string, jobId?: string | null): Promise<Partial<ResumeDoc>> {
    const [[user], jdRows, entriesRaw, bulletsRaw] = await Promise.all([
      db
        .select({
          displayName: users.displayName,
          email: users.email,
          contactEmail: users.contactEmail,
          phone: users.phone,
          location: users.location,
          headline: users.headline,
          githubUrl: users.githubUrl,
          linkedinUrl: users.linkedinUrl,
          portfolioUrl: users.portfolioUrl,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1),
      jobId
        ? db
          .select()
          .from(jdAnalyses)
          .where(and(eq(jdAnalyses.userId, userId), eq(jdAnalyses.jobId, jobId)))
          .limit(1)
        : Promise.resolve([]),
      db
        .select()
        .from(bankEntries)
        .where(and(eq(bankEntries.userId, userId), isNull(bankEntries.deletedAt))),
      db
        .select()
        .from(achievementBullets)
        .where(and(eq(achievementBullets.userId, userId), isNull(achievementBullets.deletedAt)))
        .orderBy(asc(achievementBullets.sortOrder), asc(achievementBullets.id)),
    ]);

    if (entriesRaw.length === 0) return {};

    const bulletsByEntry = new Map<string, AchievementBullet[]>();
    for (const b of bulletsRaw) {
      const list = bulletsByEntry.get(b.entryId) || [];
      list.push(b as unknown as AchievementBullet);
      bulletsByEntry.set(b.entryId, list);
    }

    const fullEntries: BankEntry[] = entriesRaw.map((e) => ({
      ...(e as unknown as BankEntry),
      bullets: bulletsByEntry.get(e.id) || [],
    }));

    const jdAnalysis = jdRows[0]?.analysisJson as unknown as JDAnalysis | undefined;
    const jdKeywords = jdAnalysis
      ? [
        ...(jdAnalysis.keywords || []).flatMap((k) => [k.canonical, ...(k.synonyms || [])]),
        ...(jdAnalysis.role?.domain || []),
      ].filter(Boolean)
      : [];
    const jdTitle = jdAnalysis?.role?.title || undefined;
    const relevanceMap = new Map<string, number>();

    if (jdAnalysis) {
      const retrieval = BulletRetriever.retrieveCandidates(fullEntries, jdAnalysis, 4200);
      for (const c of retrieval.candidates) {
        relevanceMap.set(c.bullet.id, c.scoreBreakdown.totalScore);
      }
    }

    const links: Array<{ label: string; url: string }> = [];
    if (user?.githubUrl) links.push({ label: "GitHub", url: user.githubUrl });
    if (user?.linkedinUrl) links.push({ label: "LinkedIn", url: user.linkedinUrl });
    if (user?.portfolioUrl) links.push({ label: "Portfolio", url: user.portfolioUrl });

    const headlineText = (user?.headline || "").trim();
    const narrativeSummary = extractProfileSummaryFromEntries(fullEntries, headlineText);

    const selectBulletsForEntry = (entry: BankEntry, maxBullets: number) => {
      const eligible = (entry.bullets || []).filter((b) => b.usagePolicy !== "never_use");
      if (entry.entryType === "experience") {
        return selectExperienceBulletsForRole({
          bullets: eligible,
          jdKeywords,
          jdTitle,
          maxBullets,
        });
      }
      if (!jdAnalysis || eligible.length <= maxBullets) {
        return eligible.slice(0, maxBullets);
      }
      const topByRole = [...eligible]
        .sort((a, b) => (relevanceMap.get(b.id) ?? 0) - (relevanceMap.get(a.id) ?? 0) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .slice(0, maxBullets);

      return topByRole.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    };

    const experience = fullEntries
      .filter((e) => e.entryType === "experience")
      .sort(compareReverseChronological)
      .slice(0, 4)
      .map((e, idx) => ({
        id: e.id,
        company: e.organization || "",
        position: e.title,
        startDate: e.startDate || "",
        endDate: e.endDate || null,
        isCurrent: Boolean(e.isCurrent),
        location: e.location || undefined,
        bullets: selectBulletsForEntry(e, idx <= 1 ? 4 : 3).map((b) => ({
          id: b.id,
          text: b.text,
          provenance: "bank" as const,
          sourceBulletIds: [b.id],
          sourceFactIds: [],
          validatorStatus: "not_applicable" as const,
        })),
      }));

    const sortedProjectEntries = sortProjectsByConfidenceAndRelevance(
      fullEntries
        .filter((e) => e.entryType === "project")
        .map((e) => ({
          ...e,
          bullets: (e.bullets || []).filter((b) => b.usagePolicy !== "never_use"),
        })),
      jdKeywords,
      jdTitle
    );

    const projects = sortedProjectEntries
      .slice(0, 4)
      .map((e, idx) => {
        const eligibleBullets = e.bullets || [];
        const bulletByText = new Map(eligibleBullets.map((b) => [b.text.trim(), b]));
        const angleSelection = selectProjectAnglePoints({
          title: e.title,
          descriptionContext: e.descriptionContext,
          bullets: eligibleBullets.map((b) => ({
            id: b.id,
            text: b.text,
            sortOrder: b.sortOrder,
            relevanceScore: relevanceMap.get(b.id) ?? 0,
          })),
          jdKeywords,
          jdTitle,
          confidenceRank: typeof e.sortOrder === "number" ? e.sortOrder : idx,
          maxBullets: 2,
        });

        return {
          id: e.id,
          name: e.title,
          role: e.organization || undefined,
          description: e.descriptionContext || undefined,
          confidenceRank: typeof e.sortOrder === "number" ? e.sortOrder : idx,
          bullets: angleSelection.bullets.map((text, bIdx) => {
            const matchedBullet = bulletByText.get(text.trim());
            return {
              id: matchedBullet?.id || `${e.id}_ctx_${bIdx}`,
              text,
              provenance: "bank" as const,
              sourceBulletIds: matchedBullet ? [matchedBullet.id] : [],
              sourceFactIds: [],
              validatorStatus: "not_applicable" as const,
            };
          }),
        };
      });

    const education = fullEntries
      .filter((e) => e.entryType === "education")
      .sort(compareReverseChronological)
      .map((e) => ({
        id: e.id,
        institution: e.organization || e.title,
        degree: e.title,
        startDate: e.startDate || "",
        endDate: e.endDate || (e.isCurrent ? "Present" : ""),
      }));

    const skills: Array<{ name: string; category?: string }> = [];
    const seenSkill = new Set<string>();
    for (const s of fullEntries.filter((e) => e.entryType === "skill_group")) {
      for (const b of s.bullets || []) {
        for (const token of b.text.split(/[,•|\n]/).map((t) => t.trim()).filter(Boolean)) {
          const lower = token.toLowerCase();
          if (seenSkill.has(lower)) continue;
          seenSkill.add(lower);
          skills.push({ name: token, category: s.title });
        }
      }
    }

    const certifications = fullEntries
      .filter((e) => e.entryType === "certification")
      .map((c) => ({
        id: c.id,
        name: c.title,
        issuer: c.organization || "",
        issueDate: c.startDate || c.endDate || undefined,
      }));

    const awards = fullEntries
      .filter((e) => e.entryType === "award")
      .map((a) => ({
        id: a.id,
        name: a.title,
        issuer: normalizeDistinctAwardIssuer(a.title, a.organization || (a.bullets?.[0]?.text ?? "")),
        issueDate: a.startDate || a.endDate || undefined,
      }));

    return {
      profile: {
        name: user?.displayName || "",
        fullName: user?.displayName || "",
        headline: headlineText,
        summary: narrativeSummary,
        email: user?.contactEmail || user?.email || "",
        phone: user?.phone || "",
        location: user?.location || "",
        links,
      },
      experience,
      projects,
      education,
      skills,
      certifications,
      awards,
    };
  }

  /**
   * Creates a new resume document and an initial version
   */
  static async createResume(
    userId: string,
    title: string,
    jobId?: string | null,
    initialDoc?: Partial<ResumeDoc>
  ) {
    const docId = `res_${crypto.randomUUID()}`;
    const versionId = `ver_${crypto.randomUUID()}`;
    const [userDefaults, resolvedDocSeed, jdRows] = await Promise.all([
      SettingsService.getUserSettings(userId),
      initialDoc
        ? Promise.resolve(initialDoc)
        : jobId
          ? this.assembleInitialDocFromVault(userId, jobId)
          : Promise.resolve(undefined),
      jobId
        ? db
          .select()
          .from(jdAnalyses)
          .where(and(eq(jdAnalyses.userId, userId), eq(jdAnalyses.jobId, jobId)))
          .limit(1)
        : Promise.resolve([]),
    ]);
    const jdAnalysis = jdRows[0]?.analysisJson as unknown as JDAnalysis | undefined;
    const jdKeywords = jdAnalysis
      ? [
        ...(jdAnalysis.keywords || []).flatMap((k) => [k.canonical, ...(k.synonyms || [])]),
        ...(jdAnalysis.role?.domain || []),
      ].filter(Boolean)
      : [];
    const resolvedTemplateId = resolvedDocSeed?.template?.id || userDefaults.defaultTemplateId || "classic-ats";
    const resolvedPageSize = resolvedDocSeed?.page?.size || userDefaults.defaultPageSize || "A4";

    const canonicalDoc: ResumeDoc = budgetResumeForOnePageA4(
      sortResumeDocChronologically({
        schemaVersion: 1,
        documentId: docId,
        versionId,
        jobId: jobId || undefined,
        profile: {
          name: "",
          fullName: "",
          headline: "",
          summary: "",
          email: "",
          phone: "",
          location: "",
          links: [],
          ...(resolvedDocSeed?.profile || {}),
        },
        sections: resolvedDocSeed?.sections || [
          { id: "sec_exp", type: "experience", heading: "Experience", visible: true, items: [] },
          { id: "sec_edu", type: "education", heading: "Education", visible: true, items: [] },
          { id: "sec_skills", type: "skills", heading: "Skills", visible: true, items: [] },
          { id: "sec_projects", type: "projects", heading: "Projects", visible: true, items: [] },
        ],
        template: {
          id: resolvedTemplateId,
          version: "1.0",
          theme: {},
          ...(resolvedDocSeed?.template || {}),
        },
        page: {
          size: resolvedPageSize,
          targetPages: 1,
          ...(resolvedDocSeed?.page || {}),
        },
        metadata: {
          createdAt: new Date().toISOString(),
          ...(resolvedDocSeed?.metadata || {}),
        },
        experience: resolvedDocSeed?.experience || [],
        education: resolvedDocSeed?.education || [],
        skills: resolvedDocSeed?.skills || [],
        projects: resolvedDocSeed?.projects || [],
        certifications: resolvedDocSeed?.certifications || [],
        awards: resolvedDocSeed?.awards || [],
      }),
      { jdKeywords }
    );

    const docJsonString = JSON.stringify(canonicalDoc);
    const contentHash = createHash("sha256").update(docJsonString).digest("hex");

    await db.transaction(async (tx) => {
      await tx.insert(resumeDocuments).values({
        id: docId,
        userId,
        title,
        jobId: jobId || null,
      });

      await tx.insert(resumeVersions).values({
        id: versionId,
        userId,
        resumeDocumentId: docId,
        versionNumber: 1,
        versionKind: "working",
        resumeDocJson: canonicalDoc as any,
        contentHash,
        templateId: canonicalDoc.template?.id || "classic-ats",
      });
    });

    return {
      id: docId,
      title,
      versionId,
      document: canonicalDoc,
    };
  }

  /**
   * Autosaves draft with atomic optimistic concurrency check via row_version
   * PRD Section 9.1 & 10.6
   */
  static async autosaveDraft(
    userId: string,
    resumeId: string,
    updatedDoc: ResumeDoc,
    expectedRowVersion: number
  ) {
    if (
      expectedRowVersion === undefined ||
      expectedRowVersion === null ||
      typeof expectedRowVersion !== "number" ||
      expectedRowVersion <= 0
    ) {
      const err: any = new Error(
        "INVALID_ROW_VERSION: rowVersion (positive integer) is mandatory for concurrent autosave."
      );
      err.statusCode = 400;
      throw err;
    }

    const resume = await this.getResume(userId, resumeId);
    if (!resume) throw new Error("Resume not found");

    const currentVersion = resume.latestVersion;
    if (!currentVersion) throw new Error("No version record found");

    // Check if immutable
    if (currentVersion.immutableAt || currentVersion.versionKind === "final") {
      throw new Error("VERSION_IMMUTABLE: This finalized snapshot cannot be modified. Create a new version instead.");
    }

    const docJsonString = JSON.stringify(updatedDoc);
    const contentHash = createHash("sha256").update(docJsonString).digest("hex");

    const updatedVersion = await db.transaction(async (tx) => {
      const [ver] = await tx
        .update(resumeVersions)
        .set({
          resumeDocJson: updatedDoc as any,
          contentHash,
          templateId: updatedDoc.template?.id || currentVersion.templateId,
          rowVersion: sql`${resumeVersions.rowVersion} + 1`,
        })
        .where(
          and(
            eq(resumeVersions.userId, userId),
            eq(resumeVersions.id, currentVersion.id),
            isNull(resumeVersions.immutableAt),
            eq(resumeVersions.rowVersion, expectedRowVersion)
          )
        )
        .returning();

      if (!ver) return null;

      await tx
        .update(resumeDocuments)
        .set({
          updatedAt: new Date(),
          rowVersion: sql`${resumeDocuments.rowVersion} + 1`,
        })
        .where(and(eq(resumeDocuments.userId, userId), eq(resumeDocuments.id, resumeId)));

      return ver;
    });

    if (!updatedVersion) {
      const check = await db
        .select()
        .from(resumeVersions)
        .where(and(eq(resumeVersions.id, currentVersion.id), eq(resumeVersions.userId, userId)))
        .limit(1);

      if (!check.length) throw new Error("Resume version not found");
      if (check[0].immutableAt || check[0].versionKind === "final") {
        throw new Error("VERSION_IMMUTABLE: This finalized snapshot cannot be modified. Create a new version instead.");
      }
      const err: any = new Error(
        `CONCURRENCY_CONFLICT: Working version out of date (server row_version: ${check[0].rowVersion}, expected: ${expectedRowVersion})`
      );
      err.statusCode = 409;
      throw err;
    }

    return {
      versionId: updatedVersion.id,
      versionNumber: updatedVersion.versionNumber,
      rowVersion: updatedVersion.rowVersion,
      contentHash,
      savedAt: new Date().toISOString(),
    };
  }

  /**
   * Generates plaintext for export with atomic quota checks and tracking
   */
  static async exportPlainText(userId: string, resumeId: string): Promise<string> {
    const quota = await UsageLimitService.checkAndConsumeExportQuota(userId);
    if (!quota.allowed) {
      throw new Error("Monthly export limit reached (20 exports/month). Free tier quota resets next month.");
    }

    try {
      const resume = await this.getResume(userId, resumeId);
      if (!resume || !resume.latestVersion) throw new Error("Resume not found");

      const doc = resume.latestVersion.resumeDocJson as unknown as ResumeDoc;
      const text = PlainTextSerializer.serialize(doc);
      return text;
    } catch (err) {
      await UsageLimitService.refundExportQuota(userId);
      throw err;
    }
  }

  /**
   * Generates DOCX blob for export with atomic quota checks and tracking
   */
  static async exportDocx(userId: string, resumeId: string): Promise<Blob> {
    const quota = await UsageLimitService.checkAndConsumeExportQuota(userId);
    if (!quota.allowed) {
      throw new Error("Monthly export limit reached (20 exports/month). Free tier quota resets next month.");
    }

    try {
      const resume = await this.getResume(userId, resumeId);
      if (!resume || !resume.latestVersion) throw new Error("Resume not found");

      const doc = resume.latestVersion.resumeDocJson as unknown as ResumeDoc;
      const blob = await DocxGenerator.generateDocxBlob(doc);
      return blob;
    } catch (err) {
      await UsageLimitService.refundExportQuota(userId);
      throw err;
    }
  }
}
