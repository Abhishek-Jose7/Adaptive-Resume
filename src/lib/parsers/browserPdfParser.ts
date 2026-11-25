import { validateFileBuffer } from "./fileValidator";

export interface PdfParseResult {
  text: string;
  pageCount: number;
  pages: string[];
  isScanned: boolean;
  charCount: number;
}

export async function parsePdfBuffer(
  buffer: ArrayBuffer | Uint8Array,
  filename = "resume.pdf"
): Promise<PdfParseResult> {
  const validation = validateFileBuffer(buffer, filename);
  if (!validation.isValid) {
    throw new Error(validation.errorMessage);
  }

  const bytes = buffer instanceof ArrayBuffer
    ? new Uint8Array(buffer)
    : new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  // Dynamically load pdfjs-dist
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

  // PDF.js ships its worker separately. Bundle it with the app so the parser
  // works in production builds as well as in local development.
  if (typeof window !== "undefined" && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/legacy/build/pdf.worker.mjs",
      import.meta.url,
    ).toString();
  }

  const loadingTask = pdfjsLib.getDocument({
    data: bytes,
    useSystemFonts: true,
    isEvalSupported: false,
  });

  const doc = await loadingTask.promise;
  const pageCount = doc.numPages;

  // PRD Section 6.3 I6: Limit <= 10 pages
  if (pageCount > 10) {
    throw new Error(`PDF exceeds the 10-page limit (Found ${pageCount} pages).`);
  }

  const pages: string[] = [];

  for (let i = 1; i <= pageCount; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    let pageText = "";
    let lastY: number | null = null;

    for (const item of content.items) {
      if (!("str" in item)) continue;
      const str = item.str;
      if (!str) continue;

      const y = Array.isArray(item.transform) ? item.transform[5] : null;

      // When the vertical baseline drops or PDF.js reports an EOL, emit a newline
      if (lastY !== null && y !== null && Math.abs(y - lastY) > 3) {
        pageText += "\n";
      } else if (item.hasEOL) {
        pageText += "\n";
      } else if (pageText.length > 0 && !pageText.endsWith("\n") && !pageText.endsWith(" ")) {
        pageText += " ";
      }

      pageText += str;
      lastY = y;
    }

    pages.push(pageText.trim());
  }

  const fullText = pages.join("\n\n");
  const charCount = fullText.trim().length;
  // Browser-side detection: scanned PDFs have negligible/empty selectable text (< 50 chars)
  const isScanned = charCount < 50;

  return {
    text: fullText,
    pageCount,
    pages,
    isScanned,
    charCount,
  };
}
