import { ResumeDoc, ResumeBullet } from "@/types/resume";

export interface AutoFitSettings {
  step: number; // 1 to 8
  stepDescription: string;
  sectionGapRem: number;
  lineHeight: number;
  fontSizePt: number;
  marginInches: number;
  isCompactVariant: boolean;
  suggestedBulletRemovals: Array<{
    bulletId: string;
    bulletText: string;
    experienceId: string;
    company: string;
  }>;
  overflowWarning?: string;
}

export class AutoFitLadder {
  private static readonly MAX_PAGE_ESTIMATED_CHARS = 3800; // ~1 page standard US Letter / A4

  /**
   * Calculates deterministic auto-fit ladder settings for 1-page fit
   * PRD Section 10.6
   */
  static evaluateFit(doc: ResumeDoc, currentStep: number = 1): AutoFitSettings {
    const totalChars = this.calculateTotalChars(doc);

    // Baseline settings (Step 1)
    let sectionGapRem = 1.0;
    let lineHeight = 1.4;
    let fontSizePt = 10.5;
    let marginInches = 0.75;
    let isCompactVariant = false;
    let stepDescription = "Standard template spacing & typography";
    const suggestedBulletRemovals: AutoFitSettings["suggestedBulletRemovals"] = [];
    let overflowWarning: string | undefined;

    if (currentStep >= 2) {
      sectionGapRem = 0.65;
      stepDescription = "Step 2: Reduced section gaps to save vertical space";
    }
    if (currentStep >= 3) {
      lineHeight = 1.25;
      stepDescription = "Step 3: Reduced line spacing within readable limits (1.25)";
    }
    if (currentStep >= 4) {
      fontSizePt = 9.5;
      stepDescription = "Step 4: Reduced body font size to 9.5pt";
    }
    if (currentStep >= 5) {
      marginInches = 0.5;
      stepDescription = "Step 5: Compact print margins (0.5 in)";
    }
    if (currentStep >= 6) {
      stepDescription = "Step 6: Content pruning recommended (bullets exceed 1-page budget)";
      for (const exp of doc.experience || []) {
        if (exp.bullets.length > 3) {
          for (let i = 3; i < exp.bullets.length; i++) {
            suggestedBulletRemovals.push({
              bulletId: exp.bullets[i].id,
              bulletText: exp.bullets[i].text,
              experienceId: exp.id,
              company: exp.company,
            });
          }
        }
      }
    }
    if (currentStep >= 7) {
      isCompactVariant = true;
      fontSizePt = 9.0;
      stepDescription = "Step 7: High-density compact template variant enabled";
    }
    if (currentStep >= 8 || totalChars > this.MAX_PAGE_ESTIMATED_CHARS) {
      if (totalChars > this.MAX_PAGE_ESTIMATED_CHARS) {
        overflowWarning =
          "One-page fit cannot be achieved without content removal. Review and accept removing non-critical bullets.";
      }
    }

    return {
      step: currentStep,
      stepDescription,
      sectionGapRem,
      lineHeight,
      fontSizePt,
      marginInches,
      isCompactVariant,
      suggestedBulletRemovals,
      overflowWarning,
    };
  }

  private static calculateTotalChars(doc: ResumeDoc): number {
    let count = 0;
    if (doc.profile.summary) count += doc.profile.summary.length;
    for (const exp of doc.experience || []) {
      count += (exp.position || (exp as any).role || "").length + (exp.company || (exp as any).organization || "").length;
      for (const b of exp.bullets || []) {
        count += (b.text || "").length;
      }
    }
    for (const edu of doc.education || []) {
      count += ((edu as any).institution || (edu as any).school || (edu as any).organization || "").length + (edu.degree || "").length;
    }
    for (const proj of doc.projects || []) {
      count += ((proj as any).name || (proj as any).title || "").length + ((proj as any).description || "").length;
      for (const b of proj.bullets || []) {
        count += (b.text || "").length;
      }
    }
    for (const s of doc.skills || []) {
      count += ((s as any).name || (s as any).category || "").length;
      if (Array.isArray((s as any).items)) {
        count += (s as any).items.join(" ").length;
      }
    }
    return count;
  }
}
