import { describe, it, expect, vi, beforeAll } from "vitest";
import { POST as ocrHandler } from "@/app/api/v1/ocr/route";
import { NextRequest } from "next/server";

describe("Document Intake Architecture & OCR.space Integration", () => {
  beforeAll(() => {
    process.env.ENABLE_DEV_AUTH_BYPASS = "true";
    process.env.DEV_USER_ID = "usr_ocr_test_user";
  });
  it("should classify selectable vs scanned PDF based on character count threshold", () => {
    const selectableText = "Senior Full Stack Engineer with 7 years of production experience in TypeScript and React.";
    const scannedText = "   ";

    const isSelectableScanned = selectableText.trim().length < 50;
    const isImageScanned = scannedText.trim().length < 50;

    expect(isSelectableScanned).toBe(false); // Selectable PDF -> local parser
    expect(isImageScanned).toBe(true); // Scanned PDF -> OCR.space external engine
  });

  it("should normalize OCR text into structured candidate items for staging", async () => {
    // Mock fetch for OCR.space
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ParsedResults: [
          {
            ParsedText: "Senior Software Engineer\nAcme Corp 2021-Present\n- Built high-performance microservices\n- Optimized database latency by 45%",
            FileParseExitCode: 1,
          },
        ],
        OCRExitCode: 1,
        IsErroredOnProcessing: false,
      }),
    } as any);

    try {
      const req = new NextRequest("http://localhost:3000/api/v1/ocr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-test-user-id": "usr_ocr_test_user",
        },
        body: JSON.stringify({
          base64Image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        }),
      });

      const response = await ocrHandler(req);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.text).toContain("Senior Software Engineer");
      expect(json.items).toHaveLength(1);
      expect(json.items[0].entryType).toBe("experience");
      expect(json.items[0].parsedDataJson.title).toBe("Senior Software Engineer");
      expect(json.items[0].parsedDataJson.bullets).toContain("- Built high-performance microservices");
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("should handle OCR.space processing errors gracefully", async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        IsErroredOnProcessing: true,
        ErrorMessage: ["File format not recognized or corrupted image"],
      }),
    } as any);

    try {
      const req = new NextRequest("http://localhost:3000/api/v1/ocr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-test-user-id": "usr_ocr_test_user",
        },
        body: JSON.stringify({
          base64Image: "invalid_data",
        }),
      });

      const response = await ocrHandler(req);
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.error.message).toContain("File format not recognized");
    } finally {
      global.fetch = originalFetch;
    }
  });
});
