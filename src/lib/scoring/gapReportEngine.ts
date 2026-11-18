import { JDAnalysis, JDKeyword } from "@/types/job";
import { ResumeDoc } from "@/types/resume";
import { BankEntry, AchievementBullet } from "@/types/bank";

export type GapCategory = "in_bank_not_on_resume" | "in_profile_unverified" | "missing_from_bank";

export interface KeywordGapItem {
  keyword: JDKeyword;
  category: GapCategory;
  recommendedAction: string;
  uiLabel: string;
  suggestedBullets?: AchievementBullet[];
}

export interface GapReport {
  jobId: string;
  totalMissingCount: number;
  inBankNotOnResume: KeywordGapItem[];
  inProfileUnverified: KeywordGapItem[];
  missingFromBank: KeywordGapItem[];
}

export class GapReportEngine {
  /**
   * Generates a structured Gap Report categorizing missing keywords according to PRD 10.4 & 10.5
   */
  static generateReport(
    resume: ResumeDoc,
    jdAnalysis: JDAnalysis,
    bankEntries: BankEntry[] = []
  ): GapReport {
    // Collect all resume text
    const expParts = (resume.experience || []).flatMap((e) => [
      e.position,
      e.company,
      ...e.bullets.map((b) => b.text),
    ]);
    const projParts = (resume.projects || []).flatMap((p) => [
      p.name,
      ...p.bullets.map((b) => b.text),
    ]);
    const skillParts = (resume.skills || []).map((s) => s.name);

    const resumeTextParts: string[] = [
      resume.profile.summary || "",
      resume.profile.headline || "",
      ...expParts,
      ...projParts,
      ...skillParts,
    ];
    const resumeText = resumeTextParts.join(" ").toLowerCase();

    // Index bank entries and bullets
    const bankKeywordBulletMap = new Map<string, AchievementBullet[]>();
    for (const entry of bankEntries) {
      if (entry.bullets) {
        for (const bullet of entry.bullets) {
          const bulletLower = bullet.text.toLowerCase();
          for (const kw of jdAnalysis.keywords) {
            const canonical = kw.canonical.toLowerCase();
            if (
              bulletLower.includes(canonical) ||
              kw.synonyms.some((s) => bulletLower.includes(s.toLowerCase()))
            ) {
              const existing = bankKeywordBulletMap.get(canonical) || [];
              existing.push(bullet);
              bankKeywordBulletMap.set(canonical, existing);
            }
          }
        }
      }
    }

    const inBankNotOnResume: KeywordGapItem[] = [];
    const inProfileUnverified: KeywordGapItem[] = [];
    const missingFromBank: KeywordGapItem[] = [];

    for (const kw of jdAnalysis.keywords) {
      if (kw.userOverride === "removed") continue;

      const canonical = kw.canonical.toLowerCase();
      const isCoveredInResume =
        resumeText.includes(canonical) ||
        kw.synonyms.some((s) => resumeText.includes(s.toLowerCase()));

      if (isCoveredInResume) {
        // Keyword is present in resume!
        continue;
      }

      // Check if it exists in Data Bank
      const matchingBullets = bankKeywordBulletMap.get(canonical);

      if (matchingBullets && matchingBullets.length > 0) {
        inBankNotOnResume.push({
          keyword: kw,
          category: "in_bank_not_on_resume",
          recommendedAction: `Add an existing verified bullet from your Data Bank highlighting ${kw.canonical}.`,
          uiLabel: "In Data Bank (Not on current resume)",
          suggestedBullets: matchingBullets.slice(0, 3),
        });
      } else {
        // Check if mentioned in bank entry skills/contexts without a bullet
        const mentionedInProfile = bankEntries.some(
          (e) =>
            e.title?.toLowerCase().includes(canonical) ||
            e.descriptionContext?.toLowerCase().includes(canonical) ||
            e.facts?.some((f) => f.valueText.toLowerCase().includes(canonical))
        );

        if (mentionedInProfile) {
          inProfileUnverified.push({
            keyword: kw,
            category: "in_profile_unverified",
            recommendedAction: `You listed ${kw.canonical} in your profile, but have no quantified achievement bullets demonstrating it. Add a verified bullet.`,
            uiLabel: "In Profile (Unverified)",
          });
        } else {
          missingFromBank.push({
            keyword: kw,
            category: "missing_from_bank",
            recommendedAction: `Genuine skill gap. Highlight adjacent experience or consider upskilling. Do not invent experience.`,
            uiLabel: "Not in your Data Bank — add only if true",
          });
        }
      }
    }

    return {
      jobId: (jdAnalysis as any).jobId || "current-job",
      totalMissingCount:
        inBankNotOnResume.length + inProfileUnverified.length + missingFromBank.length,
      inBankNotOnResume,
      inProfileUnverified,
      missingFromBank,
    };
  }
}
