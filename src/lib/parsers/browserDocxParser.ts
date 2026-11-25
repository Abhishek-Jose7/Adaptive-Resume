import mammoth from "mammoth";
import JSZip from "jszip";
import { validateFileBuffer } from "./fileValidator";

export interface DocxParseResult {
  text: string;
  rawHtml: string;
  lines: string[];
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

/**
 * Converts Mammoth HTML into clean structured plain text preserving bullet markers (<li>),
 * table rows (<tr>/<td>), headings, and anchor URLs (<a href="...">).
 */
function htmlToStructuredResumeText(html: string): string {
  if (!html) return "";

  let text = html;

  // Preserve hyperlink URLs if link label doesn't already display the URL
  text = text.replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, label: string) => {
    const cleanLabel = label.replace(/<[^>]+>/g, "").trim();
    const cleanHref = decodeHtmlEntities(href).trim();
    if (/^(?:mailto:|https?:\/\/)/i.test(cleanHref)) {
      const normalizedHref = cleanHref.replace(/^mailto:/i, "");
      if (cleanLabel.toLowerCase().includes(normalizedHref.replace(/^https?:\/\/(?:www\.)?/i, "").toLowerCase())) {
        return cleanLabel;
      }
      if (/^(?:github|linkedin|portfolio|website|link|email|mail)/i.test(cleanLabel) || cleanLabel.length < 25) {
        return `${cleanLabel} (${normalizedHref})`;
      }
      return `${cleanLabel} ${normalizedHref}`;
    }
    return cleanLabel;
  });

  // Preserve bullet list items cleanly
  text = text.replace(/<li[^>]*>/gi, "\n• ");
  text = text.replace(/<\/li>/gi, "\n");

  // Preserve table cells on the same row and rows on separate lines
  text = text.replace(/<\/t[dh]>\s*<t[dh][^>]*>/gi, " | ");
  text = text.replace(/<\/tr>/gi, "\n");

  // Block boundaries -> newlines
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/(?:p|div|h[1-6]|ul|ol|table|blockquote)>/gi, "\n");
  text = text.replace(/<(?:p|div|h[1-6]|tr)[^>]*>/gi, "\n");

  // Strip remaining HTML tags
  text = text.replace(/<[^>]+>/g, "");
  text = decodeHtmlEntities(text);

  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/[ \t]{2,}/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

async function extractDocxHeaderFooterLines(nodeBuffer: Buffer): Promise<string[]> {
  try {
    const zip = await JSZip.loadAsync(nodeBuffer);
    const headerFiles = Object.values(zip.files).filter((f) =>
      /^word\/(?:header|footer)\d*\.xml$/i.test(f.name)
    );
    if (headerFiles.length === 0) return [];

    const extracted: string[] = [];
    for (const f of headerFiles) {
      const xml = await f.async("string");
      // Extract text nodes inside WordprocessingML <w:p> paragraphs
      const paragraphs = xml.split(/<\/w:p>/i);
      for (const p of paragraphs) {
        const parts = Array.from(p.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/gi)).map((m) => m[1]);
        const line = decodeHtmlEntities(parts.join("")).replace(/\s+/g, " ").trim();
        if (line.length > 1) {
          extracted.push(line);
        }
      }
    }
    return extracted;
  } catch {
    return [];
  }
}

export async function parseDocxBuffer(
  buffer: ArrayBuffer | Uint8Array,
  filename = "resume.docx"
): Promise<DocxParseResult> {
  const validation = validateFileBuffer(buffer, filename);
  if (!validation.isValid) {
    throw new Error(validation.errorMessage);
  }

  const nodeBuffer = buffer instanceof Uint8Array
    ? Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    : Buffer.from(new Uint8Array(buffer));

  // Extract raw text, HTML (preserving lists, tables, links), and Word header/footer XML
  const [textResult, htmlResult, headerFooterLines] = await Promise.all([
    mammoth.extractRawText({ buffer: nodeBuffer }),
    mammoth.convertToHtml({ buffer: nodeBuffer }),
    extractDocxHeaderFooterLines(nodeBuffer),
  ]);

  const htmlStructured = htmlToStructuredResumeText(htmlResult.value);
  const rawText = (htmlStructured || textResult.value).trim();

  const bodyLines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Prepend header lines that are not already present in body
  const bodyLower = rawText.toLowerCase();
  const uniqueHeaderLines = headerFooterLines.filter(
    (hl) => !bodyLower.includes(hl.toLowerCase()) && !/^\d+$/.test(hl)
  );

  const lines = [...uniqueHeaderLines, ...bodyLines];
  const finalText = lines.join("\n");

  return {
    text: finalText,
    rawHtml: htmlResult.value,
    lines,
  };
}
