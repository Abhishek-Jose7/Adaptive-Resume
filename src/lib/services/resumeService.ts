import { db } from "../db/client";
import { resumeDocuments, resumeVersions, jobs } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";
import { ResumeDoc } from "@/types/resume";
import { createHash } from "crypto";
import { PlainTextSerializer } from "../export/plainTextSerializer";
import { DocxGenerator } from "../export/docxGenerator";

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

    const canonicalDoc: ResumeDoc = {
      schemaVersion: 1,
      documentId: docId,
      versionId,
      jobId: jobId || undefined,
      profile: {
        name: "Your Name",
        fullName: "Your Full Name",
        headline: "Professional Headline",
        summary: "Results-driven professional with proven experience delivering measurable outcomes.",
        email: "user@example.com",
        phone: "+1 555-0100",
        location: "City, State",
        links: [],
        ...(initialDoc?.profile || {}),
      },
      sections: initialDoc?.sections || [
        { id: "sec_exp", type: "experience", heading: "Experience", visible: true, items: [] },
        { id: "sec_edu", type: "education", heading: "Education", visible: true, items: [] },
        { id: "sec_skills", type: "skills", heading: "Skills", visible: true, items: [] },
        { id: "sec_projects", type: "projects", heading: "Projects", visible: true, items: [] },
      ],
      template: {
        id: "classic-ats",
        version: "1.0",
        theme: {},
        ...(initialDoc?.template || {}),
      },
      page: {
        size: "LETTER",
        targetPages: 1,
        ...(initialDoc?.page || {}),
      },
      metadata: {
        createdAt: new Date().toISOString(),
        ...(initialDoc?.metadata || {}),
      },
      experience: initialDoc?.experience || [],
      education: initialDoc?.education || [],
      skills: initialDoc?.skills || [],
      projects: initialDoc?.projects || [],
      certifications: initialDoc?.certifications || [],
    };

    const docJsonString = JSON.stringify(canonicalDoc);
    const contentHash = createHash("sha256").update(docJsonString).digest("hex");

    await db.insert(resumeDocuments).values({
      id: docId,
      userId,
      title,
      jobId: jobId || null,
    });

    await db.insert(resumeVersions).values({
      id: versionId,
      userId,
      resumeDocumentId: docId,
      versionNumber: 1,
      versionKind: "working",
      resumeDocJson: canonicalDoc as any,
      contentHash,
      templateId: canonicalDoc.template?.id || "classic-ats",
    });

    return {
      id: docId,
      title,
      versionId,
      document: canonicalDoc,
    };
  }

  /**
   * Autosaves draft with optimistic concurrency check
   * PRD Section 9.1 & 10.6
   */
  static async autosaveDraft(
    userId: string,
    resumeId: string,
    updatedDoc: ResumeDoc,
    clientVersionNumber?: number
  ) {
    const resume = await this.getResume(userId, resumeId);
    if (!resume) throw new Error("Resume not found");

    const currentVersion = resume.latestVersion;
    if (!currentVersion) throw new Error("No version record found");

    // Check if immutable
    if (currentVersion.immutableAt || currentVersion.versionKind === "final") {
      throw new Error("VERSION_IMMUTABLE: This finalized snapshot cannot be modified. Create a new version instead.");
    }

    // Optimistic Concurrency check
    if (clientVersionNumber !== undefined && currentVersion.versionNumber !== clientVersionNumber) {
      throw new Error(`CONFLICT: Working version out of date (server: ${currentVersion.versionNumber}, client: ${clientVersionNumber})`);
    }

    const docJsonString = JSON.stringify(updatedDoc);
    const contentHash = createHash("sha256").update(docJsonString).digest("hex");

    await db
      .update(resumeVersions)
      .set({
        resumeDocJson: updatedDoc as any,
        contentHash,
        templateId: updatedDoc.template?.id || currentVersion.templateId,
      })
      .where(and(eq(resumeVersions.userId, userId), eq(resumeVersions.id, currentVersion.id)));

    await db
      .update(resumeDocuments)
      .set({
        updatedAt: new Date(),
      })
      .where(and(eq(resumeDocuments.userId, userId), eq(resumeDocuments.id, resumeId)));

    return {
      versionId: currentVersion.id,
      versionNumber: currentVersion.versionNumber,
      contentHash,
      savedAt: new Date().toISOString(),
    };
  }

  /**
   * Generates plaintext for export
   */
  static async exportPlainText(userId: string, resumeId: string): Promise<string> {
    const resume = await this.getResume(userId, resumeId);
    if (!resume || !resume.latestVersion) throw new Error("Resume not found");

    const doc = resume.latestVersion.resumeDocJson as unknown as ResumeDoc;
    return PlainTextSerializer.serialize(doc);
  }

  /**
   * Generates DOCX blob for export
   */
  static async exportDocx(userId: string, resumeId: string): Promise<Blob> {
    const resume = await this.getResume(userId, resumeId);
    if (!resume || !resume.latestVersion) throw new Error("Resume not found");

    const doc = resume.latestVersion.resumeDocJson as unknown as ResumeDoc;
    return await DocxGenerator.generateDocxBlob(doc);
  }
}
