import { NextRequest } from "next/server";
import { getAuthUserId } from "@/lib/auth/clerk";
import { apiSuccess, handleApiError } from "@/lib/api/response";

const OCR_SPACE_API_KEY = process.env.OCR_SPACE_API_KEY || "K87048907188957";
const OCR_SPACE_ENDPOINT = "https://api.ocr.space/parse/image";

export async function POST(req: NextRequest) {
  try {
    await getAuthUserId(req);

    const contentType = req.headers.get("content-type") || "";
    let extractedText = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return handleApiError(new Error("No file provided in form data"));
      }

      // Forward to OCR.space
      const ocrFormData = new FormData();
      ocrFormData.append("file", file, file.name);
      ocrFormData.append("apikey", OCR_SPACE_API_KEY);
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

      if (!base64Image && !url) {
        return handleApiError(new Error("Missing base64Image or file"));
      }

      const ocrFormData = new FormData();
      ocrFormData.append("apikey", OCR_SPACE_API_KEY);
      ocrFormData.append("language", "eng");
      ocrFormData.append("isOverlayRequired", "false");
      ocrFormData.append("detectOrientation", "true");
      ocrFormData.append("scale", "true");
      ocrFormData.append("OCREngine", "2");

      if (base64Image) {
        ocrFormData.append("base64Image", base64Image);
      } else if (url) {
        ocrFormData.append("url", url);
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

    return apiSuccess({
      text: cleanedText,
      lineCount: lines.length,
      items,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
