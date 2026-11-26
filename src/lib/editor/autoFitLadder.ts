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
   * Recommends the minimum AutoFit ladder step (1..7) needed to fit the document cleanly
   * onto a single A4/LETTER resume page without hiding content.
   */
  static recommendedStepForOnePage(doc: ResumeDoc): number {
    const totalChars = this.calculateTotalChars(doc);
    if (totalChars <= 2000) return 1;
    if (totalChars <= 2400) return 2;
    if (totalChars <= 2800) return 3;
    if (totalChars <= 3200) return 4;
    if (totalChars <= 3600) return 5;
    if (totalChars <= 3900) return 6;
    return 7;
  }

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

    const exps = doc.experience && doc.experience.length > 0
      ? doc.experience
      : doc.sections?.find((s) => s.type === "experience")?.items || [];
    for (const exp of exps as any[]) {
      count += (exp.position || exp.title || exp.role || "").length + (exp.company || exp.organization || "").length;
      for (const b of exp.bullets || []) {
        count += (typeof b === "string" ? b : b.text || "").length;
      }
    }

    const edus = doc.education && doc.education.length > 0
      ? doc.education
      : doc.sections?.find((s) => s.type === "education")?.items || [];
    for (const edu of edus as any[]) {
      count += (edu.institution || edu.school || edu.organization || "").length + (edu.degree || edu.title || "").length;
    }

    const projs = doc.projects && doc.projects.length > 0
      ? doc.projects
      : doc.sections?.find((s) => s.type === "projects")?.items || [];
    for (const proj of projs as any[]) {
      count += (proj.name || proj.title || "").length + (proj.description || "").length;
      for (const b of proj.bullets || []) {
        count += (typeof b === "string" ? b : b.text || "").length;
      }
    }

    const skills = doc.skills && doc.skills.length > 0
      ? doc.skills
      : doc.sections?.find((s) => s.type === "skills")?.items || [];
    for (const s of skills as any[]) {
      count += (s.name || s.title || s.category || "").length;
      if (Array.isArray(s.items)) {
        count += s.items.join(" ").length;
      }
    }
    return count;
  }
}
