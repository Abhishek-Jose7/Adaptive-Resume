import { db } from "../db/client";
import { coverLetters, jobs, jdAnalyses, bankEntries, achievementBullets, bulletFacts, users } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";
import { ProviderFactory } from "../ai/providerFactory";
import { BulletRetriever } from "../tailoring/bulletRetriever";
import { JDAnalysis } from "@/types/job";
import { BankEntry, AchievementBullet, StructuredFact } from "@/types/bank";
import { CanaryDetector } from "../intelligence/canaryDetector";

export type CoverLetterTone = "professional" | "concise" | "formal" | "conversational";

export interface GenerateCoverLetterInput {
  jobId: string;
  tone?: CoverLetterTone;
  providerName?: string;
  apiKey?: string;
}

export class CoverLetterService {
  /**
   * Lists cover letters for a user
   */
  static async listCoverLetters(userId: string) {
    return await db
      .select({
        id: coverLetters.id,
        userId: coverLetters.userId,
        jobId: coverLetters.jobId,
        title: coverLetters.title,
        tone: coverLetters.tone,
        createdAt: coverLetters.createdAt,
        updatedAt: coverLetters.updatedAt,
        jobTitle: jobs.title,
        jobCompany: jobs.company,
      })
      .from(coverLetters)
      .leftJoin(jobs, and(eq(coverLetters.jobId, jobs.id), eq(jobs.userId, userId)))
      .where(eq(coverLetters.userId, userId))
      .orderBy(desc(coverLetters.updatedAt));
  }

  /**
   * Retrieves single cover letter
   */
  static async getCoverLetter(userId: string, id: string) {
    const list = await db
      .select({
        id: coverLetters.id,
        userId: coverLetters.userId,
        jobId: coverLetters.jobId,
        title: coverLetters.title,
        content: coverLetters.content,
        tone: coverLetters.tone,
        createdAt: coverLetters.createdAt,
        updatedAt: coverLetters.updatedAt,
        jobTitle: jobs.title,
        jobCompany: jobs.company,
      })
      .from(coverLetters)
      .leftJoin(jobs, and(eq(coverLetters.jobId, jobs.id), eq(jobs.userId, userId)))
      .where(and(eq(coverLetters.userId, userId), eq(coverLetters.id, id)))
      .limit(1);

    return list[0] || null;
  }

  /**
   * Generates a strictly truth-grounded cover letter from user's verified Data Bank bullets
   * PRD Section 7.5, 9.2 & 10.4
   */
  static async generateCoverLetter(userId: string, input: GenerateCoverLetterInput) {
    const { jobId, tone = "professional", providerName, apiKey } = input;

    // 1. Fetch Job and JD Analysis
    const jobList = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.userId, userId), eq(jobs.id, jobId)))
      .limit(1);

    if (jobList.length === 0) throw new Error("Job record not found");
    const job = jobList[0];

    const jdList = await db
      .select()
      .from(jdAnalyses)
      .where(and(eq(jdAnalyses.userId, userId), eq(jdAnalyses.jobId, jobId)))
      .limit(1);

    if (jdList.length === 0) throw new Error("Job description has not been analyzed yet");
    const jdAnalysis = jdList[0].analysisJson as unknown as JDAnalysis;

    // 2. Fetch User Bank Entries and Bullets
    const userEntries = await db
      .select()
      .from(bankEntries)
      .where(eq(bankEntries.userId, userId));

    const userBullets = await db
      .select()
      .from(achievementBullets)
      .where(eq(achievementBullets.userId, userId));

    const userFacts = await db
      .select()
      .from(bulletFacts)
      .where(eq(bulletFacts.userId, userId));

    const bulletsByEntry = new Map<string, AchievementBullet[]>();
    for (const b of userBullets) {
      const list = bulletsByEntry.get(b.entryId) || [];
      list.push(b as unknown as AchievementBullet);
      bulletsByEntry.set(b.entryId, list);
    }

    const fullEntries: BankEntry[] = userEntries.map((e) => ({
      ...(e as unknown as BankEntry),
      bullets: bulletsByEntry.get(e.id) || [],
    }));

    // 3. Retrieve Top Relevant Candidate Achievements
    const retrieval = BulletRetriever.retrieveCandidates(fullEntries, jdAnalysis, 4000);
    const topBullets = retrieval.candidates.slice(0, 5).map((c) => ({
      text: c.bullet.text,
      company: c.parentEntry.organization,
      title: c.parentEntry.title,
    }));

    // 4. Generate Grounded Cover Letter with Canary Protection
    const [userRecord] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    const userEmail = userRecord?.email || null;

    const provider = ProviderFactory.getProvider(providerName, apiKey, "reasoning", userEmail);

    const canaryScan = CanaryDetector.detectCanaryTraps(job.rawText || "");
    const quarantinedKeywords = canaryScan.quarantinedKeywords;

    const systemPrompt = `You are a Truth-Bound Executive Cover Letter Generator.
STRICT INTEGRITY RULES:
1. ONLY reference experiences, employers, technologies, and metrics present in the candidate's achievements.
2. NEVER hallucinate achievements or claim skills not in the evidence.
3. RECRUITER HONEY-POT & CANARY TRAP PROTECTION:
   Job postings intentionally contain fake keywords and trap technologies (e.g. "Cribbage", made-up libraries) to catch and auto-disqualify AI applicants.
   - NEVER mention or mirror ANY technology or tool from the job description unless it is explicitly evidenced in candidate achievements.
4. Tone: ${tone}.
5. Structure:
   - Salutation to Hiring Manager
   - Opening paragraph expressing targeted alignment with the role
   - 2 body paragraphs connecting candidate's genuine achievements to the role's core responsibilities
   - Closing paragraph inviting discussion with professional sign-off.
6. Return JSON: { "title": string, "content": string }`;

    const userPayload = {
      roleTarget: {
        title: job.title || jdAnalysis.role.title || "Target Role",
        company: job.company || jdAnalysis.role.company || "Company",
      },
      candidateAchievements: topBullets,
      jdResponsibilities: jdAnalysis.responsibilities.slice(0, 3).map((r) => r.text),
      tone,
    };

    let title = `Cover Letter - ${job.title || "Position"} at ${job.company || "Company"}`;
    let content = "";

    try {
      const res = await provider.generateStructured<{ title: string; content: string }>({
        task: "cover_letter",
        systemPrompt,
        userPayload,
        schema: {},
        maxOutputTokens: 1024,
        temperature: 0.2,
      });

      if (res.data?.content) {
        content = res.data.content;
        if (res.data.title) title = res.data.title;

        // Post-generation Canary Sanitization
        for (const qWord of quarantinedKeywords) {
          const regex = new RegExp(`\\b${qWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
          content = content.replace(regex, "");
        }
      }
    } catch (err) {
      console.warn("LLM cover letter generation fallback:", err);
    }

    // Deterministic fallback if model is offline or returns empty
    if (!content) {
      const roleName = job.title || "the advertised role";
      const companyName = job.company || "your organization";

      content = `Dear Hiring Team,\n\nI am writing to express my strong interest in the ${roleName} position at ${companyName}. With a proven track record delivering measurable outcomes and engineering resilient solutions, I am excited about the opportunity to contribute to your team.\n\nThroughout my career, I have focused on solving critical challenges with high standards of technical excellence. In my recent work, I:\n` +
        topBullets.map((b) => `• ${b.text}`).join("\n") +
        `\n\nI look forward to discussing how my experience and approach align with the goals of ${companyName}.\n\nSincerely,\nCandidate`;
    }

    const id = `cl_${crypto.randomUUID()}`;
    const [created] = await db
      .insert(coverLetters)
      .values({
        id,
        userId,
        jobId,
        title,
        content,
        tone,
      })
      .returning();

    return created;
  }

  /**
   * Updates cover letter content or title
   */
  static async updateCoverLetter(userId: string, id: string, updates: { title?: string; content?: string; tone?: string }) {
    const values: Record<string, any> = { updatedAt: new Date() };
    if (updates.title !== undefined) values.title = updates.title;
    if (updates.content !== undefined) values.content = updates.content;
    if (updates.tone !== undefined) values.tone = updates.tone;

    const [updated] = await db
      .update(coverLetters)
      .set(values)
      .where(and(eq(coverLetters.userId, userId), eq(coverLetters.id, id)))
      .returning();

    return updated;
  }

  /**
   * Deletes a cover letter
   */
  static async deleteCoverLetter(userId: string, id: string) {
    const [deleted] = await db
      .delete(coverLetters)
      .where(and(eq(coverLetters.userId, userId), eq(coverLetters.id, id)))
      .returning();

    return Boolean(deleted);
  }
}
