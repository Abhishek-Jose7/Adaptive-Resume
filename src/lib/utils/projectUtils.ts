/**
 * Utilities for formatting and shortening project details across
 * Career Vault, Resume Templates, Tailoring, and Document Exports.
 */

/**
 * Shortens a project description appropriately for resume sections and exports.
 * 
 * Rules:
 * 1. If null, undefined, or empty: returns undefined.
 * 2. Cleans up raw markdown code fences, headers, URLs, or extra whitespace.
 * 3. If description is already concise (<= maxLength, default 130 chars) and 1 sentence: returns it clean.
 * 4. If description has multiple sentences, extracts the first complete, punchy sentence.
 * 5. If still exceeding maxLength, cleanly truncates at word boundary with an ellipsis ("...").
 * 6. Avoids cutting words in half or ending on dangling punctuation (e.g. "...,", "...-").
 */
export function shortenProjectDescription(
  rawDescription?: string | null,
  maxLength: number = 130
): string | undefined {
  if (!rawDescription || typeof rawDescription !== "string") return undefined;

  let text = rawDescription
    .replace(/```[\s\S]*?```/g, "") // remove code blocks
    .replace(/^#+\s+.*$/gm, "") // remove markdown heading lines
    .replace(/https?:\/\/\S+/g, "") // remove raw URLs (URL is separate field)
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return undefined;

  // If already shorter than maxLength and doesn't contain multiple sentences
  if (text.length <= maxLength && !/[.!?]\s+[A-Z]/.test(text)) {
    return text.replace(/[.,;:\s]+$/, "") + ".";
  }

  // Extract first complete sentence if available
  const sentenceMatch = text.match(/^(.+?[.!?])(?:\s+|$)/);
  if (sentenceMatch && sentenceMatch[1]) {
    const firstSentence = sentenceMatch[1].trim();
    if (firstSentence.length <= maxLength) {
      return firstSentence;
    }
    text = firstSentence;
  }

  // Truncate cleanly at word boundary
  if (text.length > maxLength) {
    const truncated = text.slice(0, maxLength);
    const lastSpace = truncated.lastIndexOf(" ");
    if (lastSpace > 40) {
      text = truncated.slice(0, lastSpace).replace(/[.,;:!?\s]+$/, "");
    } else {
      text = truncated.replace(/[.,;:!?\s]+$/, "");
    }
    return `${text}...`;
  }

  return text;
}

/**
 * Groups skills by category for resume templates and exports,
 * enabling bold category titles (e.g. **Languages:** Python, TypeScript).
 */
export function getGroupedSkills(
  skills?: Array<{ name: string; category?: string }>
): { category: string; items: string[] }[] {
  if (!skills || skills.length === 0) return [];

  const groups: { [cat: string]: string[] } = {};
  const hasCategories = skills.some((s) => Boolean(s.category && s.category.trim()));

  if (!hasCategories) {
    return [{ category: "", items: skills.map((s) => s.name) }];
  }

  for (const s of skills) {
    const cat = s.category?.trim() || "Technical Skills";
    if (!groups[cat]) groups[cat] = [];
    if (!groups[cat].includes(s.name)) {
      groups[cat].push(s.name);
    }
  }

  return Object.entries(groups).map(([category, items]) => ({ category, items }));
}
