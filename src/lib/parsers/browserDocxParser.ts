import mammoth from "mammoth";
import { validateFileBuffer } from "./fileValidator";

export interface DocxParseResult {
  text: string;
  rawHtml: string;
  lines: string[];
}

export async function parseDocxBuffer(
  buffer: ArrayBuffer | Uint8Array,
  filename = "resume.docx"
): Promise<DocxParseResult> {
  const validation = validateFileBuffer(buffer, filename);
  if (!validation.isValid) {
    throw new Error(validation.errorMessage);
  }

  const nodeBuffer = Buffer.from(buffer instanceof ArrayBuffer ? buffer : buffer.buffer);

  // Extract raw text and HTML using mammoth
  const [textResult, htmlResult] = await Promise.all([
    mammoth.extractRawText({ buffer: nodeBuffer }),
    mammoth.convertToHtml({ buffer: nodeBuffer }),
  ]);

  const rawText = textResult.value.trim();
  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  return {
    text: rawText,
    rawHtml: htmlResult.value,
    lines,
  };
}
