import { fetchJobPostingHtml } from "../security/ssrfProtection";
import crypto from "crypto";

export interface ScrapedJobResult {
  title?: string;
  company?: string;
  location?: string;
  sourceUrl: string;
  rawText: string;
  contentHash: string;
}

export class JobScraperService {
  /**
   * Calculates content hash for deduplication and caching
   */
  static computeContentHash(text: string): string {
    const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();
    return crypto.createHash("sha256").update(normalized).digest("hex");
  }

  /**
   * Scrapes a job posting with SSRF protections and schema.org JSON-LD extraction
   */
  static async scrapeJobUrl(url: string): Promise<ScrapedJobResult> {
    const html = await fetchJobPostingHtml(url);

    // 1. Preferred order: Try extracting schema.org JobPosting JSON-LD (PRD Section 6.4 J2)
    const jsonLdMatch = html.match(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    );

    let title: string | undefined;
    let company: string | undefined;
    let location: string | undefined;
    let descriptionText = "";

    if (jsonLdMatch) {
      for (const tag of jsonLdMatch) {
        try {
          const jsonContent = tag.replace(/<script[^>]*>|<\/script>/gi, "").trim();
          const parsed = JSON.parse(jsonContent);

          const jobPosting = Array.isArray(parsed)
            ? parsed.find((item) => item["@type"] === "JobPosting")
            : parsed["@type"] === "JobPosting"
            ? parsed
            : parsed["@graph"]?.find((item: any) => item["@type"] === "JobPosting");

          if (jobPosting) {
            title = jobPosting.title;
            company =
              typeof jobPosting.hiringOrganization === "string"
                ? jobPosting.hiringOrganization
                : jobPosting.hiringOrganization?.name;
            location =
              typeof jobPosting.jobLocation === "string"
                ? jobPosting.jobLocation
                : jobPosting.jobLocation?.address?.addressLocality ||
                  jobPosting.jobLocation?.address?.addressRegion;

            if (jobPosting.description) {
              // Strip HTML tags from description
              descriptionText = jobPosting.description
                .replace(/<[^>]*>/g, " ")
                .replace(/\s+/g, " ")
                .trim();
            }
            break;
          }
        } catch {
          // If JSON parse fails, continue to next tag or HTML extraction
        }
      }
    }

    // 2. Fallback to clean readable text extraction
    if (!descriptionText) {
      // Remove scripts, styles, headers, navigation, footers
      const cleanHtml = html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<header[\s\S]*?<\/header>/gi, "")
        .replace(/<nav[\s\S]*?<\/nav>/gi, "")
        .replace(/<footer[\s\S]*?<\/footer>/gi, "");

      descriptionText = cleanHtml
        .replace(/<[^>]*>/g, "\n")
        .replace(/\n\s*\n/g, "\n")
        .trim();
    }

    // Attempt to extract title from <title> tag if not already found
    if (!title) {
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      if (titleMatch) {
        title = titleMatch[1].replace(/\s+/g, " ").trim();
      }
    }

    const contentHash = this.computeContentHash(descriptionText);

    return {
      title,
      company,
      location,
      sourceUrl: url,
      rawText: descriptionText,
      contentHash,
    };
  }
}
