import { NextRequest } from "next/server";
import { getAuthUserId } from "@/lib/auth/clerk";
import { apiSuccess, apiError, handleApiError } from "@/lib/api/response";
import { db } from "@/lib/db/client";
import { auditEvents } from "@/lib/db/schema";
import { checkAndConsumeOcrRateLimit } from "@/lib/security/ocrRateLimiter";
import { OcrConsentService } from "@/lib/security/ocrConsentService";
import { ResumeStructuringService } from "@/lib/parsers/resumeStructuringService";
import { ImportRepository } from "@/lib/repositories/importRepository";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);
const OCR_SPACE_ENDPOINT = "https://api.ocr.space/parse/image";

interface OcrWordBox {
  WordText?: string;
  Left?: number;
  Top?: number;
  Height?: number;
  Width?: number;
}

interface OcrLineBox {
  LineText?: string;
  MinTop?: number;
  MaxHeight?: number;
  Words?: OcrWordBox[];
}

/**
 * Reconstructs clean reading order (including two-column Canva/design PDFs) from OCR.space
 * TextOverlay bounding boxes so left and right columns do not mix horizontally.
 * Falls back to `ParsedText` when TextOverlay is unavailable.
 */
function reconstructOcrPageText(parsedResult: {
  ParsedText?: string;
  TextOverlay?: { Lines?: OcrLineBox[] };
}): string {
  const overlayLines = parsedResult.TextOverlay?.Lines;
  if (!Array.isArray(overlayLines) || overlayLines.length === 0) {
    return parsedResult.ParsedText || "";
  }

  // Group OCR words into visual lines by vertical Top center and inspect horizontal spans
  interface WordSpan {
    text: string;
    left: number;
    right: number;
    top: number;
    height: number;
  }

  const allWords: WordSpan[] = [];
  for (const line of overlayLines) {
    if (Array.isArray(line.Words) && line.Words.length > 0) {
      for (const w of line.Words) {
        const txt = (w.WordText || "").trim();
        if (!txt) continue;
        const left = Number(w.Left ?? 0);
        const width = Number(w.Width ?? Math.max(10, txt.length * 8));
        const top = Number(w.Top ?? line.MinTop ?? 0);
        const height = Number(w.Height ?? line.MaxHeight ?? 14);
        allWords.push({ text: txt, left, right: left + width, top, height });
      }
    } else if (line.LineText?.trim()) {
      allWords.push({
        text: line.LineText.trim(),
        left: 0,
        right: 500,
        top: Number(line.MinTop ?? 0),
        height: Number(line.MaxHeight ?? 14),
      });
    }
  }

  if (allWords.length === 0) {
    return parsedResult.ParsedText || "";
  }

  const joinWordsAsLines = (words: WordSpan[]): Array<{ top: number; text: string; minLeft: number; maxRight: number; segments: Array<{ minL: number; maxR: number; words: number }> }> => {
    const sorted = [...words].sort((a, b) => a.top - b.top || a.left - b.left);
    const groups: Array<{ top: number; height: number; words: WordSpan[] }> = [];

    for (const w of sorted) {
      const g = groups.find((grp) => Math.abs(grp.top - w.top) <= Math.max(6, Math.max(grp.height, w.height) * 0.55));
      if (g) {
        g.words.push(w);
        g.height = Math.max(g.height, w.height);
      } else {
        groups.push({ top: w.top, height: w.height, words: [w] });
      }
    }

    return groups
      .sort((a, b) => a.top - b.top)
      .map((g) => {
        const rowWords = [...g.words].sort((a, b) => a.left - b.left);
        const segments: Array<{ minL: number; maxR: number; words: number; parts: string[] }> = [];
        for (const w of rowWords) {
          const last = segments[segments.length - 1];
          const gapThreshold = Math.max(22, g.height * 1.9);
          if (last && w.left - last.maxR < gapThreshold) {
            last.parts.push(w.text);
            last.maxR = Math.max(last.maxR, w.right);
            last.words += 1;
          } else {
            segments.push({ minL: w.left, maxR: w.right, words: 1, parts: [w.text] });
          }
        }
        return {
          top: g.top,
          text: segments.map((s) => s.parts.join(" ")).join("   "),
          minLeft: rowWords[0].left,
          maxRight: Math.max(...rowWords.map((w) => w.right)),
          segments: segments.map(({ minL, maxR, words: wc }) => ({ minL, maxR, words: wc })),
        };
      });
  };

  const rows = joinWordsAsLines(allWords);
  if (rows.length < 8) {
    return rows.map((r) => r.text).join("\n");
  }

  const pageMinX = Math.min(...rows.map((r) => r.minLeft));
  const pageMaxX = Math.max(...rows.map((r) => r.maxRight));
  const span = pageMaxX - pageMinX;

  let bestGutter: number | null = null;
  let bestScore = -1;
  let bestHeaderCount = 0;

  if (span >= 300) {
    for (let frac = 0.28; frac <= 0.62; frac += 0.03) {
      const gutterX = pageMinX + span * frac;
      let headerCount = 0;
      for (let h = 0; h < Math.min(4, rows.length); h++) {
        if (rows[h].segments.some((s) => s.minL < gutterX - 8 && s.maxR > gutterX + 8)) {
          headerCount = h + 1;
        }
      }

      const body = rows.slice(headerCount);
      if (body.length < 6) continue;

      let crossing = 0;
      let leftLines = 0;
      let rightLines = 0;
      let leftWords = 0;
      let rightWords = 0;

      for (const r of body) {
        let hasL = false;
        let hasR = false;
        for (const s of r.segments) {
          if (s.minL < gutterX - 8 && s.maxR > gutterX + 8) {
            crossing++;
          } else if (s.maxR <= gutterX + 6) {
            hasL = true;
            leftWords += s.words;
          } else if (s.minL >= gutterX - 6) {
            hasR = true;
            rightWords += s.words;
          }
        }
        if (hasL) leftLines++;
        if (hasR) rightLines++;
      }

      const totalW = leftWords + rightWords;
      if (crossing <= 2 && leftLines >= 4 && rightLines >= 4 && leftWords >= 14 && rightWords >= 14 && totalW > 0 && Math.min(leftWords, rightWords) / totalW >= 0.15) {
        const score = leftLines + rightLines - crossing * 4;
        if (score > bestScore) {
          bestScore = score;
          bestGutter = gutterX;
          bestHeaderCount = headerCount;
        }
      }
    }
  }

  if (bestGutter === null) {
    return rows.map((r) => r.text).join("\n");
  }

  const headerText = rows.slice(0, bestHeaderCount).map((r) => r.text);
  const bodyWords = allWords.filter((w) => w.top >= (rows[bestHeaderCount]?.top ?? 0) - 2);
  const leftWordsArr = bodyWords.filter((w) => (w.left + w.right) / 2 < bestGutter!);
  const rightWordsArr = bodyWords.filter((w) => (w.left + w.right) / 2 >= bestGutter!);

  const leftRows = joinWordsAsLines(leftWordsArr).map((r) => r.text);
  const rightRows = joinWordsAsLines(rightWordsArr).map((r) => r.text);

  return [...headerText, ...leftRows, ...rightRows].filter(Boolean).join("\n");
}

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
    let documentLabel = "Scanned Document";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();

      const file = formData.get("file") as File | null;
      if (!file) {
        return apiError("BAD_REQUEST", "No file provided in form data", 400);
      }

      processedFileSize = file.size;
      documentLabel = file.name;

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

          await ImportRepository.syncPersonalDetailsToProfile(userId, visionResult.stagedItems, {
            overwriteExisting: false,
          }).catch((err) => console.warn("Failed to auto-sync vision personal details:", err));

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

      const isPdf = Boolean(
        file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
      );

      // Forward to OCR.space with TextOverlay coordinates enabled so two-column PDFs stay unscrambled
      const ocrFormData = new FormData();
      ocrFormData.append("file", file, file.name);
      ocrFormData.append("apikey", apiKey || "");
      ocrFormData.append("language", "eng");
      ocrFormData.append("isOverlayRequired", "true");
      ocrFormData.append("detectOrientation", "true");
      ocrFormData.append("scale", "true");
      // Engine 2 generally yields higher accuracy on modern fonts/Canva PDFs, with Engine 1 for multi-page
      ocrFormData.append("OCREngine", isPdf ? "1" : "2");
      if (isPdf) {
        ocrFormData.append("filetype", "PDF");
      }

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
          (r: { ParsedText?: string; TextOverlay?: { Lines?: OcrLineBox[] } }) =>
            reconstructOcrPageText(r)
        ).join("\n\n");
      }

      if (!extractedText.trim()) {
        const firstErr = result.ParsedResults?.[0]?.ErrorMessage || result.ErrorMessage?.join?.(", ");
        if (firstErr) {
          throw new Error(`OCR processing error: ${firstErr}`);
        }
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

          await ImportRepository.syncPersonalDetailsToProfile(userId, visionResult.stagedItems, {
            overwriteExisting: false,
          }).catch((err) => console.warn("Failed to auto-sync vision personal details:", err));

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
      ocrFormData.append("isOverlayRequired", "true");
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
          (r: { ParsedText?: string; TextOverlay?: { Lines?: OcrLineBox[] } }) =>
            reconstructOcrPageText(r)
        ).join("\n\n");
      }

      if (!extractedText.trim()) {
        const firstErr = result.ParsedResults?.[0]?.ErrorMessage || result.ErrorMessage?.join?.(", ");
        if (firstErr) {
          throw new Error(`OCR processing error: ${firstErr}`);
        }
      }
    }

    const cleanedText = extractedText.replace(/\r\n/g, "\n").trim();
    const lines = cleanedText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (cleanedText.length === 0) {
      throw new Error(
        "No readable text could be extracted from this document. Please ensure the scan is legible and uncorrupted."
      );
    }

    // Use hybrid AI Pipeline A when configured outside mocked unit tests, falling back to deterministic structuring
    const hasAiParserKey = Boolean(
      process.env.GROQ_API_KEY ||
      process.env.GROQ_API_KEY_FALLBACK ||
      process.env.OPENROUTER_API_KEY_PARSER ||
      process.env.OPENROUTER_API_KEY
    );
    let items: any[] = [];
    let engineUsed = "ocr_space_deterministic";

    if (process.env.VITEST !== "true" && hasAiParserKey) {
      try {
        const { AiResumeParserService } = await import("@/lib/ai/services/aiResumeParserService");
        const aiResult = await AiResumeParserService.parseFromText(cleanedText, documentLabel);
        if (aiResult.stagedItems.length > 0) {
          items = aiResult.stagedItems;
          engineUsed = `ocr_space+${aiResult.parserModel}`;
        }
      } catch (aiErr: any) {
        console.warn("AI structuring on OCR text failed, using deterministic structuring:", aiErr.message);
      }
    }

    if (items.length === 0) {
      const structuredSections = ResumeStructuringService.structureResumeText(cleanedText, documentLabel);
      items = ResumeStructuringService.toStagedItemInputs(structuredSections);
    }

    // Fallback if automatic structuring yielded 0 items but raw lines exist
    if (items.length === 0 && lines.length > 0) {
      const candidateBullets = lines.filter((l) => l.length > 5);
      items = [
        {
          entryType: "experience",
          rawSnippet: `Scanned Document / OCR Extracted (${lines.length} lines detected)`,
          parsedDataJson: {
            title: candidateBullets[0] || "Scanned Career Entry",
            organization: "Imported via OCR Engine",
            bullets: candidateBullets.slice(1, 25),
          },
          confidence: 0.85,
        },
      ];
    }

    // Auto-sync extracted Personal Details directly to blank fields on user profile
    await ImportRepository.syncPersonalDetailsToProfile(userId, items, {
      overwriteExisting: false,
    }).catch((err) => console.warn("Failed to auto-sync OCR personal details:", err));

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
          engine: engineUsed,
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
