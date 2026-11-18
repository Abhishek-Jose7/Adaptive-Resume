import { db } from "../db/client";
import { applications, jobs, resumeVersions } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";

export type ApplicationStatus =
  | "Saved"
  | "Applied"
  | "Screening"
  | "Interview"
  | "Offer"
  | "Rejected"
  | "Withdrawn";

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
   * Lists all applications for a user with joined job and version details
   */
  static async listApplications(userId: string, statusFilter?: ApplicationStatus) {
    let query = db
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
        versionNumber: resumeVersions.versionNumber,
      })
      .from(applications)
      .leftJoin(jobs, eq(applications.jobId, jobs.id))
      .leftJoin(resumeVersions, eq(applications.resumeVersionId, resumeVersions.id))
      .where(
        statusFilter
          ? and(eq(applications.userId, userId), eq(applications.status, statusFilter))
          : eq(applications.userId, userId)
      )
      .orderBy(desc(applications.updatedAt));

    return await query;
  }

  /**
   * Retrieves single application
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
        versionNumber: resumeVersions.versionNumber,
      })
      .from(applications)
      .leftJoin(jobs, eq(applications.jobId, jobs.id))
      .leftJoin(resumeVersions, eq(applications.resumeVersionId, resumeVersions.id))
      .where(and(eq(applications.userId, userId), eq(applications.id, id)))
      .limit(1);

    return list[0] || null;
  }

  /**
   * Creates an application tracking record
   */
  static async createApplication(userId: string, input: ApplicationInput) {
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
   * Updates an application status, notes, or dates
   */
  static async updateApplication(userId: string, id: string, updates: Partial<ApplicationInput>) {
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
