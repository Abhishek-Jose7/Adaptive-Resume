import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth/clerk";
import { ResumeService } from "@/lib/services/resumeService";
import { errorResponse } from "@/lib/api/response";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId(req);
  if (!userId) {
    return errorResponse("UNAUTHENTICATED", "Authentication required", 401);
  }

  const { id: resumeId } = await params;

  try {
    const docxBlob = await ResumeService.exportDocx(userId, resumeId);
    const arrayBuffer = await docxBlob.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="resume_${resumeId}.docx"`,
      },
    });
  } catch (err: any) {
    if (err.message?.includes("Monthly export limit reached") || err.message?.includes("QUOTA_EXHAUSTED")) {
      return errorResponse("QUOTA_EXHAUSTED", err.message, 429);
    }
    return errorResponse("INTERNAL_ERROR", err.message, 500);
  }
}
