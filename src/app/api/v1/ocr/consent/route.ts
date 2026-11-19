import { NextRequest } from "next/server";
import { getAuthUserId } from "@/lib/auth/clerk";
import { apiSuccess, apiError, handleApiError } from "@/lib/api/response";
import { OcrConsentService, CURRENT_OCR_POLICY_VERSION } from "@/lib/security/ocrConsentService";

export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthUserId(req);
    const status = await OcrConsentService.getConsentStatus(userId);

    return apiSuccess({
      ...status,
      currentPolicyVersion: CURRENT_OCR_POLICY_VERSION,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId(req);
    const body = await req.json().catch(() => ({}));
    const action = body.action || "grant";

    if (action === "grant") {
      const policyVersion = body.policyVersion || CURRENT_OCR_POLICY_VERSION;
      const record = await OcrConsentService.recordConsent(userId, policyVersion);
      return apiSuccess({
        message: "OCR third-party processing consent successfully recorded.",
        record,
      });
    } else if (action === "revoke") {
      await OcrConsentService.revokeConsent(userId);
      return apiSuccess({
        message: "OCR third-party processing consent revoked.",
      });
    } else {
      return apiError("BAD_REQUEST", `Invalid action '${action}'. Allowed: 'grant', 'revoke'`, 400);
    }
  } catch (err) {
    return handleApiError(err);
  }
}
