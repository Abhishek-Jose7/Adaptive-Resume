import { NextRequest } from "next/server";
import { getAuthUserId } from "@/lib/auth/clerk";
import { successResponse, errorResponse, handleApiError } from "@/lib/api/response";
import { ResumeService } from "@/lib/services/resumeService";
import { ResumeQualityGateService } from "@/lib/export/resumeQualityGate";
import { CanaryDetector } from "@/lib/intelligence/canaryDetector";
import { ResumeDoc } from "@/types/resume";
import { db } from "@/lib/db/client";
import { jobs } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthUserId(req);
    const { id: resumeId } = await params;

    const resume = await ResumeService.getResume(userId, resumeId);
    if (!resume) return errorResponse("NOT_FOUND", "Resume not found", 404);

    let doc: ResumeDoc = resume.latestVersion?.resumeDocJson as ResumeDoc;
    let shouldSanitize = false;
    // Allow evaluating draft doc passed in body
    try {
      const body = await req.json();
      if (body && body.doc) {
        doc = body.doc;
      }
      if (body && body.sanitize) {
        shouldSanitize = true;
      }
    } catch {
      // no body, use latest version
    }

    if (!doc) return errorResponse("BAD_REQUEST", "No resume document content available to audit", 400);

    let jdText: string | undefined;
    if (resume.document.jobId) {
      const [job] = await db
        .select({ rawText: jobs.rawText })
        .from(jobs)
        .where(and(eq(jobs.id, resume.document.jobId), eq(jobs.userId, userId)))
        .limit(1);
      if (job) jdText = job.rawText;
    }

    const audit = ResumeQualityGateService.auditResume(doc, { jdText });

    if (shouldSanitize && (audit.errors || []).some((e: any) => e.rule === "CANARY_KEYWORD_DETECTED")) {
      const scan = CanaryDetector.detectCanaryTraps(jdText || "");
      const sanitizedDoc = ResumeQualityGateService.sanitizeCanaryKeywords(doc, scan.quarantinedKeywords);
      const postSanitizeAudit = ResumeQualityGateService.auditResume(sanitizedDoc, { jdText });
      return successResponse({ audit: postSanitizeAudit, sanitizedDoc });
    }

    return successResponse(audit);
  } catch (err) {
    return handleApiError(err);
  }
}
