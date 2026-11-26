import { validateFileBuffer } from "./fileValidator";

export interface PdfParseResult {
  text: string;
  pageCount: number;
  pages: string[];
  isScanned: boolean;
  charCount: number;
  extractedLinks?: string[];
}

interface PdfTextRun {
  str: string;
  x: number;
  y: number;
  endX: number;
  fontSize: number;
  hasEOL: boolean;
}

interface HorizontalSegment {
  text: string;
  minX: number;
  maxX: number;
  y: number;
  fontSize: number;
}

interface VisualLine {
  y: number;
  fontSize: number;
  items: PdfTextRun[];
  runs: HorizontalSegment[];
  text: string;
  minX: number;
  maxX: number;
}

function joinRunsIntoText(items: PdfTextRun[]): string {
  const sorted = [...items].sort((a, b) => a.x - b.x);
  let text = "";
  let prevEndX: number | null = null;
  let prevX: number | null = null;
  let prevStr = "";

  for (const item of sorted) {
    const raw = item.str;
    if (!raw) continue;

    // Skip double-strike bold duplicates at nearly identical coordinates
    if (
      prevX !== null &&
      Math.abs(item.x - prevX) < 1.8 &&
      raw.trim() &&
      raw.trim() === prevStr.trim()
    ) {
      continue;
    }

    if (text.length > 0 && prevEndX !== null) {
      const gap = item.x - prevEndX;
      const alreadyHasBoundarySpace = /\s$/.test(text) || /^\s/.test(raw);
      const joinDirectly =
        !alreadyHasBoundarySpace &&
        gap <= item.fontSize * 0.11 &&
        // Avoid merging separate tokens if gap is strongly negative on non-overlapping runs
        gap >= -item.fontSize * 0.8;

      if (!alreadyHasBoundarySpace && !joinDirectly) {
        if (gap >= item.fontSize * 1.65) {
          text += "   ";
        } else {
          text += " ";
        }
      }
    }

    text += raw;
    prevX = item.x;
    prevEndX = item.endX;
    prevStr = raw;
  }

  return text.replace(/[ \t]{4,}/g, "   ").trim();
}

function buildVisualLines(runs: PdfTextRun[]): VisualLine[] {
  // Sort top-to-bottom (PDF Y axis increases upwards), then left-to-right
  const sorted = [...runs].sort((a, b) => {
    const yDiff = b.y - a.y;
    if (Math.abs(yDiff) > Math.max(2.5, Math.min(a.fontSize, b.fontSize) * 0.35)) {
      return yDiff;
    }
    return a.x - b.x;
  });

  const lineGroups: Array<{ y: number; fontSize: number; items: PdfTextRun[] }> = [];

  for (const item of sorted) {
    if (!item.str.trim() && !item.hasEOL) continue;
    const targetGroup = lineGroups.find(
      (g) => Math.abs(g.y - item.y) <= Math.max(2.5, Math.max(g.fontSize, item.fontSize) * 0.35)
    );
    if (targetGroup) {
      targetGroup.items.push(item);
      targetGroup.fontSize = Math.max(targetGroup.fontSize, item.fontSize);
    } else {
      lineGroups.push({ y: item.y, fontSize: item.fontSize, items: [item] });
    }
  }

  return lineGroups
    .sort((a, b) => b.y - a.y)
    .map((group) => {
      const sortedItems = [...group.items].sort((a, b) => a.x - b.x);
      // Merge horizontally close items into contiguous horizontal segments for column detection
      const segments: HorizontalSegment[] = [];
      for (const item of sortedItems) {
        if (!item.str.trim()) continue;
        const lastSeg = segments[segments.length - 1];
        if (lastSeg && item.x - lastSeg.maxX < Math.max(7, group.fontSize * 1.15)) {
          const joined = joinRunsIntoText([
            {
              str: lastSeg.text,
              x: lastSeg.minX,
              endX: lastSeg.maxX,
              y: lastSeg.y,
              fontSize: lastSeg.fontSize,
              hasEOL: false,
            },
            item,
          ]);
          lastSeg.text = joined;
          lastSeg.maxX = Math.max(lastSeg.maxX, item.endX);
        } else {
          segments.push({
            text: item.str.trim(),
            minX: item.x,
            maxX: item.endX,
            y: item.y,
            fontSize: item.fontSize,
          });
        }
      }

      const text = joinRunsIntoText(sortedItems);
      const nonEmpty = sortedItems.filter((i) => i.str.trim().length > 0);
      const minX = nonEmpty.length > 0 ? Math.min(...nonEmpty.map((i) => i.x)) : 0;
      const maxX = nonEmpty.length > 0 ? Math.max(...nonEmpty.map((i) => i.endX)) : 0;

      return {
        y: group.y,
        fontSize: group.fontSize,
        items: sortedItems,
        runs: segments,
        text,
        minX,
        maxX,
      };
    })
    .filter((l) => l.text.length > 0);
}

function formatPageLinesWithColumnDetection(lines: VisualLine[]): string {
  if (lines.length === 0) return "";
  if (lines.length < 5) {
    return unwrapMultiColumnGridBlocks(lines).join("\n");
  }

  const pageMinX = Math.min(...lines.map((l) => l.minX));
  const pageMaxX = Math.max(...lines.map((l) => l.maxX));
  const span = pageMaxX - pageMinX;

  if (span < 240) {
    return unwrapMultiColumnGridBlocks(lines).join("\n");
  }

  // Test candidate vertical gutter positions between 26% and 66% of the active text span
  let bestSplitX: number | null = null;
  let bestBalanceScore = -1;
  let bestHeaderCount = 0;

  for (let frac = 0.28; frac <= 0.65; frac += 0.03) {
    const gutterX = pageMinX + span * frac;

    // Top-of-page lines (up to top 4 lines): skip narrow centered/left name line, treat any wide crossing line above body as header
    let headerCount = 0;
    for (let h = 0; h < Math.min(4, lines.length); h++) {
      if (lines[h].runs.some((r) => r.minX < gutterX - 6 && r.maxX > gutterX + 6)) {
        headerCount = h + 1;
      }
    }

    const bodyLines = lines.slice(headerCount);
    if (bodyLines.length < 5) continue;

    let crossingBodyRuns = 0;
    let leftLineCount = 0;
    let rightLineCount = 0;
    let leftWords = 0;
    let rightWords = 0;

    for (const line of bodyLines) {
      let hasLeft = false;
      let hasRight = false;
      for (const seg of line.runs) {
        if (seg.minX < gutterX - 5 && seg.maxX > gutterX + 5) {
          crossingBodyRuns++;
        } else if (seg.maxX <= gutterX + 4) {
          hasLeft = true;
          leftWords += seg.text.split(/\s+/).filter(Boolean).length;
        } else if (seg.minX >= gutterX - 4) {
          hasRight = true;
          rightWords += seg.text.split(/\s+/).filter(Boolean).length;
        }
      }
      if (hasLeft) leftLineCount++;
      if (hasRight) rightLineCount++;
    }

    const totalBodyWords = leftWords + rightWords;
    if (
      crossingBodyRuns <= 1 &&
      leftLineCount >= 5 &&
      rightLineCount >= 5 &&
      leftWords >= 18 &&
      rightWords >= 18 &&
      totalBodyWords > 0 &&
      Math.min(leftWords, rightWords) / totalBodyWords >= 0.16
    ) {
      const score = leftLineCount + rightLineCount - crossingBodyRuns * 5;
      if (score > bestBalanceScore) {
        bestBalanceScore = score;
        bestSplitX = gutterX;
        bestHeaderCount = headerCount;
      }
    }
  }

  if (bestSplitX === null) {
    return unwrapMultiColumnGridBlocks(lines).join("\n");
  }

  const headerLines = lines.slice(0, bestHeaderCount);
  const bodyItems = lines.slice(bestHeaderCount).flatMap((l) => l.items);

  const leftItems = bodyItems.filter((item) => {
    const center = (item.x + item.endX) / 2;
    return center < bestSplitX!;
  });
  const rightItems = bodyItems.filter((item) => {
    const center = (item.x + item.endX) / 2;
    return center >= bestSplitX!;
  });

  const leftLines = unwrapMultiColumnGridBlocks(buildVisualLines(leftItems));
  const rightLines = unwrapMultiColumnGridBlocks(buildVisualLines(rightItems));

  return [...headerLines.map((l) => l.text), ...leftLines, ...rightLines].filter(Boolean).join("\n");
}

/**
 * Detects inline multi-column blocks / grids inside a single-column page
 * (for example 2- or 3-column Skills tables or Education/Project grids) and emits
 * each column sequentially top-to-bottom instead of interleaving rows horizontally.
 * Deliberately skips 2-column header+date rows where the right column is predominantly dates/locations.
 */
function unwrapMultiColumnGridBlocks(lines: VisualLine[]): string[] {
  if (lines.length < 3) {
    return lines.map((l) => l.text);
  }

  const output: string[] = [];
  let i = 0;

  while (i < lines.length) {
    // Check if lines[i..] starts a multi-column grid block (consecutive lines with >= 2 separated runs)
    if (lines[i].runs.length < 2) {
      output.push(lines[i].text);
      i++;
      continue;
    }

    // Collect contiguous grid lines + possible 1-column orphan continuation inside Col 1
    let end = i;
    const firstColMaxGuess = lines[i].runs[0].maxX + 60;
    while (end < lines.length) {
      if (lines[end].runs.length >= 2) {
        end++;
      } else if (
        end > i &&
        lines[end].runs.length === 1 &&
        lines[end].runs[0].maxX <= firstColMaxGuess &&
        !/^(?:SUMMARY|PROFILE|EXPERIENCE|WORK\s+EXPERIENCE|PROFESSIONAL\s+EXPERIENCE|EDUCATION|PROJECTS|TECHNICAL\s+SKILLS|SKILLS|CERTIFICATIONS|ACHIEVEMENTS|AWARDS|ADDITIONAL\s+INFORMATION)$/i.test(
          lines[end].text.trim()
        )
      ) {
        // Only consume single-column continuation if it sits above the next multi-run grid line or ends a wrapped bullet
        const isLastGridLine = end + 1 >= lines.length || lines[end + 1].runs.length < 2;
        if (!isLastGridLine || lines[end].text.split(/\s+/).length <= 3) {
          end++;
          if (isLastGridLine) break;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    const block = lines.slice(i, end);
    const multiRunCount = block.filter((l) => l.runs.length >= 2).length;

    if (multiRunCount < 3) {
      output.push(lines[i].text);
      i++;
      continue;
    }

    // Find vertical column gutters that never intersect any run inside this block
    const blockMinX = Math.min(...block.map((l) => l.minX));
    const blockMaxX = Math.max(...block.map((l) => l.maxX));
    const allBlockRuns = block.flatMap((l) => l.runs);

    const gutters: number[] = [];
    let inEmpty = false;
    let emptyStart = blockMinX;

    for (let x = Math.floor(blockMinX) + 4; x < Math.ceil(blockMaxX) - 4; x += 1) {
      const covered = allBlockRuns.some((r) => r.minX <= x + 1.5 && r.maxX >= x - 1.5);
      if (!covered && !inEmpty) {
        inEmpty = true;
        emptyStart = x;
      } else if (covered && inEmpty) {
        inEmpty = false;
        const gutterWidth = x - emptyStart;
        if (gutterWidth >= 5) {
          gutters.push((emptyStart + x) / 2);
        }
      }
    }

    if (gutters.length === 0 || gutters.length > 3) {
      output.push(lines[i].text);
      i++;
      continue;
    }

    // Partition block items into (gutters.length + 1) vertical columns
    const colBuckets: PdfTextRun[][] = Array.from({ length: gutters.length + 1 }, () => []);
    for (const line of block) {
      for (const item of line.items) {
        const center = (item.x + item.endX) / 2;
        let colIdx = gutters.findIndex((g) => center < g);
        if (colIdx === -1) colIdx = gutters.length;
        colBuckets[colIdx].push(item);
      }
    }

    const nonEmptyCols = colBuckets.map((items) => buildVisualLines(items)).filter((col) => col.length > 0);
    if (nonEmptyCols.length < 2) {
      output.push(lines[i].text);
      i++;
      continue;
    }

    // Guard against misclassifying a 2-column list of "Role / Degree   Date" rows as vertical columns:
    // If there are only 2 columns and >= 45% of lines in the right column look like dates/locations/GPA, keep horizontal!
    if (nonEmptyCols.length === 2) {
      const rightCol = nonEmptyCols[1];
      const metaLikeCount = rightCol.filter((l) =>
        /(?:(?:19|20)\d{2}|present|current|ongoing|remote|hybrid|cgpa|gpa|\b\d+(?:\.\d+)?%)/i.test(l.text) &&
        l.text.length < 40
      ).length;
      if (metaLikeCount / rightCol.length >= 0.45) {
        output.push(lines[i].text);
        i++;
        continue;
      }
    }

    // Emit each column cleanly top-to-bottom!
    for (const colLines of nonEmptyCols) {
      for (const l of colLines) {
        output.push(l.text);
      }
    }
    i = end;
  }

  return output;
}

function formatPageLinesWithColumnDetectionFallbackWrapper(lines: VisualLine[]): string {
  return unwrapMultiColumnGridBlocks(lines).join("\n");
}

function stripMultiPageChrome(pages: string[]): string[] {
  if (pages.length <= 1) {
    return pages.map((p) =>
      p
        .split("\n")
        .filter((line) => !/^\s*(?:Page\s+\d+\s*(?:of|\/)\s*\d+|\d+\s*(?:of|\/)\s*\d+)\s*$/i.test(line))
        .join("\n")
    );
  }

  const pageLinesList = pages.map((p) =>
    p.split("\n").map((l) => l.trim()).filter(Boolean)
  );

  // Identify lines that repeat as top headers or bottom footers across >= 2 pages
  const edgeLineCounts = new Map<string, number>();
  for (const pLines of pageLinesList) {
    const candidates = new Set<string>([
      ...pLines.slice(0, 2).map((l) => l.toLowerCase()),
      ...pLines.slice(-2).map((l) => l.toLowerCase()),
    ]);
    for (const c of candidates) {
      edgeLineCounts.set(c, (edgeLineCounts.get(c) || 0) + 1);
    }
  }

  return pageLinesList.map((pLines, pageIdx) => {
    const cleaned = pLines.filter((line, lineIdx) => {
      const trimmed = line.trim();
      if (/^(?:Page\s+\d+(?:\s*(?:of|\/)\s*\d+)?|\d+\s*(?:of|\/)\s*\d+|Page\s*[-–—]?\s*)$/i.test(trimmed)) {
        return false;
      }
      // Standalone page number at very top or bottom of page
      if ((lineIdx === 0 || lineIdx >= pLines.length - 1) && /^\d{1,2}$/.test(trimmed)) {
        return false;
      }
      // Keep page 1 header intact; remove repeated header/footer chrome on subsequent pages
      if (pageIdx > 0 && (lineIdx < 2 || lineIdx >= pLines.length - 2)) {
        const count = edgeLineCounts.get(trimmed.toLowerCase()) || 0;
        if (count >= 2 && trimmed.length < 140) {
          return false;
        }
      }
      return true;
    });
    return cleaned.join("\n");
  });
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

  const rawPages: string[] = [];
  const extractedLinks = new Set<string>();

  for (let i = 1; i <= pageCount; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();

    const runs: PdfTextRun[] = [];
    for (const item of content.items) {
      if (!("str" in item)) continue;
      const str = item.str;
      if (!str) continue;

      const tr = Array.isArray(item.transform) ? item.transform : [10, 0, 0, 10, 0, 0];
      const fontSize = Math.hypot(tr[0] || 0, tr[1] || 0) || Math.hypot(tr[2] || 0, tr[3] || 0) || item.height || 10;
      const x = typeof tr[4] === "number" ? tr[4] : 0;
      const y = typeof tr[5] === "number" ? tr[5] : 0;
      const approxWidth = typeof item.width === "number" && item.width > 0
        ? item.width
        : str.length * fontSize * 0.45;

      runs.push({
        str,
        x,
        y,
        endX: x + approxWidth,
        fontSize,
        hasEOL: Boolean(item.hasEOL),
      });
    }

    const visualLines = buildVisualLines(runs);
    const pageText = formatPageLinesWithColumnDetection(visualLines);
    rawPages.push(pageText.trim());

    // Extract PDF hyperlink annotations (captures clickable [GitHub] / [LinkedIn] / portfolio links)
    try {
      const annotations = await page.getAnnotations();
      for (const annot of annotations) {
        if (annot && annot.subtype === "Link" && typeof annot.url === "string") {
          const cleanUrl = annot.url.trim();
          if (/^(?:https?:\/\/|mailto:)/i.test(cleanUrl)) {
            extractedLinks.add(cleanUrl.replace(/^mailto:/i, ""));
          }
        }
      }
    } catch {
      // Safe fallback when PDF has no annotations or synthetic test stream
    }
  }

  const pages = stripMultiPageChrome(rawPages);
  let fullText = pages.join("\n\n").trim();
  // Measure selectable body character count before injecting hyperlink annotations
  // so image-only PDFs with clickable URLs are still detected as scanned and routed to OCR.
  const selectableBodyCharCount = fullText.length;
  const isScanned = selectableBodyCharCount < 50;

  // Place any missing hyperlink annotation URLs right near the top contact header of page 1
  // (after line 1) so Personal Details captures them without polluting Awards/Education at bottom.
  const missingLinks = Array.from(extractedLinks).filter((url) => {
    const normalized = url.replace(/^https?:\/\/(?:www\.)?/i, "").replace(/\/+$/, "").toLowerCase();
    return normalized.length > 4 && !fullText.toLowerCase().includes(normalized);
  });

  if (missingLinks.length > 0 && pages.length > 0) {
    const linkLine = missingLinks.slice(0, 8).join(" | ");
    const p0Lines = pages[0].split("\n");
    const insertAt = Math.min(2, p0Lines.length);
    p0Lines.splice(insertAt, 0, linkLine);
    pages[0] = p0Lines.join("\n").trim();
    fullText = pages.join("\n\n").trim();
  }

  const charCount = fullText.length;

  return {
    text: fullText,
    pageCount,
    pages,
    isScanned,
    charCount,
    extractedLinks: Array.from(extractedLinks),
  };
}
