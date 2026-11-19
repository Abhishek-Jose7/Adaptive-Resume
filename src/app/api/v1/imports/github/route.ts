import { NextRequest } from "next/server";
import { getAuthUserId } from "@/lib/auth/clerk";
import { GithubImportService } from "@/lib/services/githubImportService";
import { ImportRepository } from "@/lib/repositories/importRepository";
import { successResponse, errorResponse } from "@/lib/api/response";

export async function GET(req: NextRequest) {
  const userId = await getAuthUserId(req);
  if (!userId) {
    return errorResponse("UNAUTHENTICATED", "Authentication required", 401);
  }

  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username");
  const token = searchParams.get("token") || undefined;

  if (!username) {
    return errorResponse("VALIDATION_ERROR", "Username query parameter is required.", 400);
  }

  try {
    const repos = await GithubImportService.listUserRepos(username, token);
    return successResponse({ repos });
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err.message || "Failed to fetch GitHub repositories.", 500);
  }
}

export async function POST(req: NextRequest) {
  const userId = await getAuthUserId(req);
  if (!userId) {
    return errorResponse("UNAUTHENTICATED", "Authentication required", 401);
  }

  try {
    const body = await req.json();
    const { repos, sourceLabel = "GitHub Repositories" } = body;

    if (!Array.isArray(repos) || repos.length === 0) {
      return errorResponse("VALIDATION_ERROR", "At least one repository must be selected.", 400);
    }

    const stagedInputs = GithubImportService.convertReposToStagedItems(repos);

    const { batchId } = await ImportRepository.createBatch(
      userId,
      "github",
      sourceLabel,
      repos[0]?.url || null
    );

    await ImportRepository.addStagedItems(userId, batchId, stagedInputs);

    return successResponse({
      batchId,
      stagedCount: stagedInputs.length,
      message: `Successfully staged ${stagedInputs.length} projects from GitHub for review.`,
    }, 201);
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err.message || "Failed to import GitHub repositories.", 500);
  }
}
