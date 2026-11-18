import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/clerk";
import { db } from "@/lib/db/client";
import { jobs } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { JobScraperService } from "@/lib/services/jobScraperService";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { z } from "zod";

const IngestJobSchema = z.object({
  url: z.string().url().optional(),
  title: z.string().optional(),
  company: z.string().optional(),
  location: z.string().optional(),
  sourceUrl: z.string().optional(),
  rawText: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const userJobs = await db
      .select()
      .from(jobs)
      .where(eq(jobs.userId, user.userId))
      .orderBy(desc(jobs.createdAt));

    return apiSuccess(userJobs);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const body = await req.json();
    const validated = IngestJobSchema.parse(body);

    let title = validated.title;
    let company = validated.company;
    let location = validated.location;
    let sourceUrl = validated.sourceUrl;
    let rawText = validated.rawText;

    // If a URL is provided, scrape it safely using SSRF-protected scraper
    if (validated.url) {
      const scraped = await JobScraperService.scrapeJobUrl(validated.url);
      title = title || scraped.title;
      company = company || scraped.company;
      location = location || scraped.location;
      sourceUrl = scraped.sourceUrl;
      rawText = scraped.rawText;
    }

    if (!rawText || rawText.trim().length < 10) {
      throw new Error("Job description text must be at least 10 characters.");
    }

    const contentHash = JobScraperService.computeContentHash(rawText);

    // Deduplication check: check if this user already saved this exact JD content
    const [existing] = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.userId, user.userId), eq(jobs.contentHash, contentHash)))
      .limit(1);

    if (existing) {
      return apiSuccess({ job: existing, isExisting: true }, 200);
    }

    const jobId = `job_${crypto.randomUUID()}`;

    await db.insert(jobs).values({
      id: jobId,
      userId: user.userId,
      title: title || "Target Role",
      company: company || "Target Company",
      location: location || null,
      sourceUrl: sourceUrl || null,
      rawText: rawText.trim(),
      contentHash,
    });

    const [created] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
    return apiSuccess({ job: created, isExisting: false }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
