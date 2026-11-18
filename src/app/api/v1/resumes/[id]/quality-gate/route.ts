import { NextRequest } from "next/server";
import { getAuthUserId } from "@/lib/auth/clerk";
import { successResponse, errorResponse } from "@/lib/api/response";
import { ResumeService } from "@/lib/services/resumeService";
import { ResumeQualityGateService } from "@/lib/export/resumeQualityGate";
import { ResumeDoc } from "@/types/resume";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return errorResponse("UNAUTHENTICATED", "Sign in required", 401);

  const { id: resumeId } = await params;

  try {
    const resume = await ResumeService.getResume(userId, resumeId);
    if (!resume) return errorResponse("NOT_FOUND", "Resume not found", 404);

    let doc: ResumeDoc = resume.latestVersion?.resumeDocJson as ResumeDoc;
    // Allow evaluating draft doc passed in body
    try {
      const body = await req.json();
      if (body && body.doc) {
        doc = body.doc;
      }
    } catch {
      // no body, use latest version
    }

    if (!doc) return errorResponse("BAD_REQUEST", "No resume document content available to audit", 400);

    const audit = ResumeQualityGateService.auditResume(doc);
    return successResponse(audit);
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err.message, 500);
  }
}
