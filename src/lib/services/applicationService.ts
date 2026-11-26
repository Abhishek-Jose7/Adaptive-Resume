import { db } from "../db/client";
import { applications, jobs, resumeVersions, coverLetters, applicationInterviews } from "../db/schema";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import { ApplicationInterview } from "@/types/bank";
import { computeStaleStageInfo } from "@/lib/utils/applicationStageUtils";

export type ApplicationStatus =
  | "Saved"
  | "Applied"
  | "Screening"
  | "Interview"
  | "Offer"
  | "Rejected"
  | "Withdrawn"
  | "Archived";

export interface ApplicationInput {
  jobId?: string | null;
  resumeVersionId?: string | null;
  status?: ApplicationStatus;
  appliedAt?: string | null;
  followUpAt?: string | null;
  notes?: string | null;
}

export class ApplicationService {
  /**
   * Lists all applications for a user with joined job, version, and cover letter details
   * Enforces strict tenant isolation on joined records (PRD Section 8.6 & 11.2)
   */
  static async listApplications(userId: string, statusFilter?: ApplicationStatus) {
    const list = await db
      .select({
        id: applications.id,
        userId: applications.userId,
        jobId: applications.jobId,
        resumeVersionId: applications.resumeVersionId,
        status: applications.status,
        appliedAt: applications.appliedAt,
        followUpAt: applications.followUpAt,
        notes: applications.notes,
        createdAt: applications.createdAt,
        updatedAt: applications.updatedAt,
        jobTitle: jobs.title,
        jobCompany: jobs.company,
        jobLocation: jobs.location,
        jobSourceUrl: jobs.sourceUrl,
        jobRawTextSnippet: sql<string | null>`substring(${jobs.rawText} from 1 for 300)`,
        versionNumber: resumeVersions.versionNumber,
      })
      .from(applications)
      .leftJoin(jobs, and(eq(applications.jobId, jobs.id), eq(jobs.userId, userId)))
      .leftJoin(resumeVersions, and(eq(applications.resumeVersionId, resumeVersions.id), eq(resumeVersions.userId, userId)))
      .where(
        statusFilter
          ? and(eq(applications.userId, userId), eq(applications.status, statusFilter))
          : eq(applications.userId, userId)
      )
      .orderBy(desc(applications.updatedAt));

    return list.map((item) => ({
      ...item,
      ...computeStaleStageInfo(item),
    }));
  }

  /**
   * Retrieves single application with full context: job description, cover letter, and interview history
   */
  static async getApplication(userId: string, id: string) {
    const list = await db
      .select({
        id: applications.id,
        userId: applications.userId,
        jobId: applications.jobId,
        resumeVersionId: applications.resumeVersionId,
        status: applications.status,
        appliedAt: applications.appliedAt,
        followUpAt: applications.followUpAt,
        notes: applications.notes,
        createdAt: applications.createdAt,
        updatedAt: applications.updatedAt,
        jobTitle: jobs.title,
        jobCompany: jobs.company,
        jobLocation: jobs.location,
        jobSourceUrl: jobs.sourceUrl,
        jobRawText: jobs.rawText,
        versionNumber: resumeVersions.versionNumber,
        versionDocJson: resumeVersions.resumeDocJson,
      })
      .from(applications)
      .leftJoin(jobs, and(eq(applications.jobId, jobs.id), eq(jobs.userId, userId)))
      .leftJoin(resumeVersions, and(eq(applications.resumeVersionId, resumeVersions.id), eq(resumeVersions.userId, userId)))
      .where(and(eq(applications.userId, userId), eq(applications.id, id)))
      .limit(1);

    if (list.length === 0) return null;
    const app = list[0];

    const [clList, interviews] = await Promise.all([
      db
        .select()
        .from(coverLetters)
        .where(and(eq(coverLetters.userId, userId), eq(coverLetters.applicationId, id))),
      db
        .select()
        .from(applicationInterviews)
        .where(and(eq(applicationInterviews.userId, userId), eq(applicationInterviews.applicationId, id)))
        .orderBy(asc(applicationInterviews.roundNumber)),
    ]);

    return {
      ...app,
      coverLetters: clList,
      interviews: interviews as ApplicationInterview[],
    };
  }

  /**
   * Adds an interview round to an application
   */
  static async addInterview(
    userId: string,
    applicationId: string,
    roundData: {
      roundName: string;
      roundNumber?: number;
      scheduledAt?: string | null;
      interviewers?: string;
      prepNotes?: string;
    }
  ): Promise<ApplicationInterview> {
    // Verify application exists and belongs to calling user
    const app = await db
      .select({ id: applications.id })
      .from(applications)
      .where(and(eq(applications.id, applicationId), eq(applications.userId, userId)))
      .limit(1);

    if (app.length === 0) {
      throw new Error("Application not found or access denied");
    }

    const id = `int_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const [inserted] = await db
      .insert(applicationInterviews)
      .values({
        id,
        userId,
        applicationId,
        roundName: roundData.roundName,
        roundNumber: roundData.roundNumber || 1,
        scheduledAt: roundData.scheduledAt ? new Date(roundData.scheduledAt) : null,
        interviewers: roundData.interviewers || null,
        prepNotes: roundData.prepNotes || null,
        status: "scheduled",
      })
      .returning();

    return inserted as ApplicationInterview;
  }

  /**
   * Updates an interview round
   */
  static async updateInterview(
    userId: string,
    interviewId: string,
    updates: Partial<{
      status: "scheduled" | "passed" | "failed" | "cancelled" | "rescheduled";
      feedbackNotes: string;
      prepNotes: string;
      completedAt: string;
    }>,
    applicationId?: string
  ) {
    const conditions = [
      eq(applicationInterviews.id, interviewId),
      eq(applicationInterviews.userId, userId),
    ];
    if (applicationId) {
      conditions.push(eq(applicationInterviews.applicationId, applicationId));
    }

    const [updated] = await db
      .update(applicationInterviews)
      .set({
        ...updates,
        completedAt: updates.completedAt ? new Date(updates.completedAt) : undefined,
      })
      .where(and(...conditions))
      .returning();
    return updated;
  }

  /**
   * Deletes an interview round
   */
  static async deleteInterview(
    userId: string,
    interviewId: string,
    applicationId?: string
  ): Promise<boolean> {
    const conditions = [
      eq(applicationInterviews.id, interviewId),
      eq(applicationInterviews.userId, userId),
    ];
    if (applicationId) {
      conditions.push(eq(applicationInterviews.applicationId, applicationId));
    }

    const deleted = await db
      .delete(applicationInterviews)
      .where(and(...conditions))
      .returning({ id: applicationInterviews.id });
    return deleted.length > 0;
  }

  /**
   * Creates an application tracking record with cross-tenant foreign key verification
   */
  static async createApplication(userId: string, input: ApplicationInput) {
    const [jobCheck, verCheck] = await Promise.all([
      input.jobId
        ? db
            .select({ id: jobs.id })
            .from(jobs)
            .where(and(eq(jobs.id, input.jobId), eq(jobs.userId, userId)))
            .limit(1)
        : Promise.resolve(null),
      input.resumeVersionId
        ? db
            .select({ id: resumeVersions.id })
            .from(resumeVersions)
            .where(and(eq(resumeVersions.id, input.resumeVersionId), eq(resumeVersions.userId, userId)))
            .limit(1)
        : Promise.resolve(null),
    ]);

    if (jobCheck && jobCheck.length === 0) {
      throw new Error("Referenced job not found or access denied");
    }
    if (verCheck && verCheck.length === 0) {
      throw new Error("Referenced resume version not found or access denied");
    }

    const id = `app_${crypto.randomUUID()}`;
    const [created] = await db
      .insert(applications)
      .values({
        id,
        userId,
        jobId: input.jobId || null,
        resumeVersionId: input.resumeVersionId || null,
        status: input.status || "Saved",
        appliedAt: input.appliedAt ? new Date(input.appliedAt) : null,
        followUpAt: input.followUpAt ? new Date(input.followUpAt) : null,
        notes: input.notes || null,
      })
      .returning();

    return created;
  }

  /**
   * Updates an application status, notes, or dates with tenant validation
   */
  static async updateApplication(userId: string, id: string, updates: Partial<ApplicationInput>) {
    if (updates.jobId) {
      const job = await db
        .select({ id: jobs.id })
        .from(jobs)
        .where(and(eq(jobs.id, updates.jobId), eq(jobs.userId, userId)))
        .limit(1);
      if (job.length === 0) {
        throw new Error("Referenced job not found or access denied");
      }
    }

    if (updates.resumeVersionId) {
      const ver = await db
        .select({ id: resumeVersions.id })
        .from(resumeVersions)
        .where(and(eq(resumeVersions.id, updates.resumeVersionId), eq(resumeVersions.userId, userId)))
        .limit(1);
      if (ver.length === 0) {
        throw new Error("Referenced resume version not found or access denied");
      }
    }

    const values: Record<string, any> = { updatedAt: new Date() };

    if (updates.status !== undefined) values.status = updates.status;
    if (updates.jobId !== undefined) values.jobId = updates.jobId;
    if (updates.resumeVersionId !== undefined) values.resumeVersionId = updates.resumeVersionId;
    if (updates.appliedAt !== undefined) {
      values.appliedAt = updates.appliedAt ? new Date(updates.appliedAt) : null;
    }
    if (updates.followUpAt !== undefined) {
      values.followUpAt = updates.followUpAt ? new Date(updates.followUpAt) : null;
    }
    if (updates.notes !== undefined) values.notes = updates.notes;

    const [updated] = await db
      .update(applications)
      .set(values)
      .where(and(eq(applications.userId, userId), eq(applications.id, id)))
      .returning();

    return updated;
  }

  /**
   * Deletes an application
   */
  static async deleteApplication(userId: string, id: string) {
    const [deleted] = await db
      .delete(applications)
      .where(and(eq(applications.userId, userId), eq(applications.id, id)))
      .returning();

    return Boolean(deleted);
  }
}
