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
    const textContent = await ResumeService.exportPlainText(userId, resumeId);
    return new NextResponse(textContent, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="resume_${resumeId}.txt"`,
      },
    });
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err.message, 500);
  }
}
