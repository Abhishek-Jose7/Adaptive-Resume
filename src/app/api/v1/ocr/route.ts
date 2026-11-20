import { NextRequest } from "next/server";
import { getAuthUserId } from "@/lib/auth/clerk";
import { apiSuccess, apiError, handleApiError } from "@/lib/api/response";
import { db } from "@/lib/db/client";
import { auditEvents } from "@/lib/db/schema";
import { checkAndConsumeOcrRateLimit } from "@/lib/security/ocrRateLimiter";
import { OcrConsentService } from "@/lib/security/ocrConsentService";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);
const OCR_SPACE_ENDPOINT = "https://api.ocr.space/parse/image";

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId(req);

    const apiKey = process.env.OCR_SPACE_API_KEY;
    const hasOpenRouterParser = Boolean(
      process.env.OPENROUTER_API_KEY_PARSER || process.env.OPENROUTER_API_KEY
    );

    if (!apiKey && !hasOpenRouterParser) {
      return apiError(
        "PROVIDER_UNAVAILABLE",
        "Document parsing service is not configured. Please configure OPENROUTER_API_KEY_PARSER or OCR_SPACE_API_KEY in environment variables.",
        503
      );
    }

    // 1. Enforce persistent, authenticated, server-verifiable OCR consent bound to policy version
    const hasConsent = await OcrConsentService.hasValidConsent(userId);
    if (!hasConsent) {
      const status = await OcrConsentService.getConsentStatus(userId);
      const message = status.isOutdated
        ? "OCR privacy policy has been updated. Explicit consent is required before processing."
        : "Explicit user consent is required before transmitting documents to third-party OCR services.";
      return apiError("CONSENT_REQUIRED", message, 403);
    }

    // 2. Distributed atomic serverless rate limiting (5 req/min, 25 req/day)
    const rateLimit = await checkAndConsumeOcrRateLimit(userId);
    if (!rateLimit.allowed) {
      const response = apiError(
        "RATE_LIMIT_EXCEEDED",
        rateLimit.error || `OCR request limit exceeded. Try again in ${rateLimit.resetSec}s.`,
        429
      );
      response.headers.set("Retry-After", String(rateLimit.resetSec));
      response.headers.set("X-RateLimit-Limit", String(rateLimit.limit));
      response.headers.set("X-RateLimit-Remaining", "0");
      return response;
    }

    const contentType = req.headers.get("content-type") || "";
    let extractedText = "";
    let processedFileSize = 0;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();

      const file = formData.get("file") as File | null;
      if (!file) {
        return apiError("BAD_REQUEST", "No file provided in form data", 400);
      }

      processedFileSize = file.size;

      if (file.size > MAX_FILE_SIZE) {
        return apiError(
          "BAD_REQUEST",
          `File size exceeds 10MB limit (received ${Math.round(file.size / 1024 / 1024)}MB)`,
          400
        );
      }

      if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
        return apiError(
          "UNSUPPORTED_FILE",
          `Unsupported file type '${file.type}'. Allowed formats: PDF, PNG, JPEG, WebP.`,
          400
        );
      }

      // If file is an image and OpenRouter vision model is available, attempt vision inference
      if (file.type && file.type.startsWith("image/") && hasOpenRouterParser) {
        try {
          const { AiResumeParserService } = await import("@/lib/ai/services/aiResumeParserService");
          const arrayBuffer = await file.arrayBuffer();
          const base64Data = Buffer.from(arrayBuffer).toString("base64");
          const visionResult = await AiResumeParserService.parseFromVisionImage(
            base64Data,
            file.type,
            file.name
          );

          await db
            .insert(auditEvents)
            .values({
              id: `audit_${crypto.randomUUID()}`,
              userId,
              action: "vision_resume_parsed",
              resourceType: "resume_image",
              metadataJson: {
                itemCount: visionResult.stagedItems.length,
                fileSize: processedFileSize,
                userConsentGranted: true,
                engine: visionResult.parserModel,
                isVision: true,
              },
            })
            .catch((err) => console.warn("Failed to record Vision audit event:", err));

          return apiSuccess({
            text: visionResult.structuredSections.map((s) => s.bullets.join("\n")).join("\n\n"),
            lineCount: visionResult.structuredSections.length,
            items: visionResult.stagedItems,
            normalized: visionResult.normalized,
            engine: visionResult.parserModel,
            isVision: true,
            thirdPartyNotice: "Processed securely via OpenRouter multimodal vision model. No Data Bank entries were automatically committed.",
          });
        } catch (visionErr: any) {
          console.warn("Vision parsing failed, attempting OCR.space fallback:", visionErr.message);
          if (!apiKey) {
            throw visionErr;
          }
        }
      }

      // Forward to OCR.space
      const ocrFormData = new FormData();
      ocrFormData.append("file", file, file.name);
      ocrFormData.append("apikey", apiKey || "");
      ocrFormData.append("language", "eng");
      ocrFormData.append("isOverlayRequired", "false");
      ocrFormData.append("detectOrientation", "true");
      ocrFormData.append("scale", "true");
      ocrFormData.append("OCREngine", "2");

      const response = await fetch(OCR_SPACE_ENDPOINT, {
        method: "POST",
        body: ocrFormData,
      });

      if (!response.ok) {
        throw new Error(`OCR.space API responded with status ${response.status}`);
      }

      const result = await response.json();

      if (result.IsErroredOnProcessing) {
        const errorMsg =
          result.ErrorMessage?.join?.(", ") ||
          result.ErrorMessage ||
          "OCR.space failed to process document";
        throw new Error(errorMsg);
      }

      if (result.ParsedResults && Array.isArray(result.ParsedResults)) {
        extractedText = result.ParsedResults.map(
          (r: { ParsedText?: string }) => r.ParsedText || ""
        ).join("\n\n");
      }
    } else {
      const body = await req.json();
      const { base64Image, url } = body;

      if (url) {
        return apiError(
          "BAD_REQUEST",
          "Direct URL fetching is not supported to protect against open proxy exploitation. Please upload your file directly or provide base64Image.",
          400
        );
      }

      if (!base64Image) {
        return apiError("BAD_REQUEST", "Missing base64Image or file payload", 400);
      }

      if (typeof base64Image !== "string" || base64Image.length > 15 * 1024 * 1024) {
        return apiError("BAD_REQUEST", "Base64 image payload exceeds maximum allowed size (10MB binary)", 400);
      }

      processedFileSize = base64Image.length;

      // Attempt OpenRouter vision parsing first if available
      if (hasOpenRouterParser) {
        try {
          const { AiResumeParserService } = await import("@/lib/ai/services/aiResumeParserService");
          const visionResult = await AiResumeParserService.parseFromVisionImage(
            base64Image,
            "image/png",
            "Scanned Resume"
          );

          return apiSuccess({
            text: visionResult.structuredSections.map((s) => s.bullets.join("\n")).join("\n\n"),
            lineCount: visionResult.structuredSections.length,
            items: visionResult.stagedItems,
            normalized: visionResult.normalized,
            engine: visionResult.parserModel,
            isVision: true,
            thirdPartyNotice: "Processed securely via OpenRouter multimodal vision model. No Data Bank entries were automatically committed.",
          });
        } catch (visionErr: any) {
          console.warn("Vision parsing on base64 image failed, attempting OCR.space fallback:", visionErr.message);
          if (!apiKey) {
            throw visionErr;
          }
        }
      }

      const ocrFormData = new FormData();
      ocrFormData.append("apikey", apiKey || "");
      ocrFormData.append("language", "eng");
      ocrFormData.append("isOverlayRequired", "false");
      ocrFormData.append("detectOrientation", "true");
      ocrFormData.append("scale", "true");
      ocrFormData.append("OCREngine", "2");
      ocrFormData.append("base64Image", base64Image);

      const response = await fetch(OCR_SPACE_ENDPOINT, {
        method: "POST",
        body: ocrFormData,
      });

      if (!response.ok) {
        throw new Error(`OCR.space API responded with status ${response.status}`);
      }

      const result = await response.json();

      if (result.IsErroredOnProcessing) {
        const errorMsg =
          result.ErrorMessage?.join?.(", ") ||
          result.ErrorMessage ||
          "OCR.space failed to process document";
        throw new Error(errorMsg);
      }

      if (result.ParsedResults && Array.isArray(result.ParsedResults)) {
        extractedText = result.ParsedResults.map(
          (r: { ParsedText?: string }) => r.ParsedText || ""
        ).join("\n\n");
      }
    }

    const cleanedText = extractedText.replace(/\r\n/g, "\n").trim();
    const lines = cleanedText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    // Normalised extracted items structured for staging review
    const candidateBullets = lines.filter((l) => l.length > 5);
    const items = [
      {
        entryType: "experience",
        rawSnippet: `Scanned Document / OCR Extracted (${lines.length} lines detected)`,
        parsedDataJson: {
          title: candidateBullets[0] || "Scanned Career Entry",
          organization: "Imported via OCR.space External Engine",
          bullets: candidateBullets.slice(1, 25),
        },
        confidence: 0.85,
      },
    ];

    // Log audit event
    await db
      .insert(auditEvents)
      .values({
        id: `audit_${crypto.randomUUID()}`,
        userId,
        action: "ocr_processed",
        resourceType: "ocr_document",
        metadataJson: {
          lineCount: lines.length,
          itemCount: items.length,
          fileSize: processedFileSize,
          userConsentGranted: true,
          engine: "ocr_space_engine_2",
        },
      })
      .catch((err) => console.warn("Failed to record OCR audit event:", err));

    return apiSuccess({
      text: cleanedText,
      lineCount: lines.length,
      items,
      thirdPartyNotice: "Processed externally via OCR.Space engine adhering to free-tier processing guidelines. No Data Bank entries were automatically committed.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
