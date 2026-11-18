import { ResumeDoc } from "@/types/resume";

export interface AtsLintIssue {
  id: string;
  severity: "error" | "warning" | "info";
  rule: string;
  message: string;
  section?: string;
  field?: string;
}

export interface AtsLintReport {
  score: number; // 0 to 100
  issues: AtsLintIssue[];
  passedChecks: string[];
}

export class AtsLinter {
  /**
   * Evaluates a ResumeDoc for ATS parseability and best practices
   * PRD Section 10.5 & 10.6
   */
  static lint(doc: ResumeDoc): AtsLintReport {
    const issues: AtsLintIssue[] = [];
    const passedChecks: string[] = [];

    // 1. Header & Contact Details
    const candidateName = doc.profile.fullName || doc.profile.name;
    if (!candidateName || candidateName.trim().length < 2) {
      issues.push({
        id: "missing-fullname",
        severity: "error",
        rule: "CONTACT_FULLNAME",
        message: "Full name is missing from resume header.",
        section: "profile",
      });
    } else {
      passedChecks.push("Candidate name is present and valid");
    }

    if (!doc.profile.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(doc.profile.email)) {
      issues.push({
        id: "missing-email",
        severity: "error",
        rule: "CONTACT_EMAIL",
        message: "Valid email address is missing. ATS systems require a contact email.",
        section: "profile",
      });
    } else {
      passedChecks.push("Valid email address detected");
    }

    if (!doc.profile.phone) {
      issues.push({
        id: "missing-phone",
        severity: "warning",
        rule: "CONTACT_PHONE",
        message: "Phone number is omitted. Adding a phone number improves recruiter outreach.",
        section: "profile",
      });
    }

    // 2. Experience Section
    const experienceList =
      doc.experience ||
      doc.sections
        ?.find((s) => s.type === "experience")
        ?.items?.map((it) => ({
          id: it.id,
          company: it.organization || "",
          position: it.title || "",
          startDate: it.dates?.start || "",
          endDate: it.dates?.end || null,
          isCurrent: it.dates?.current || false,
          location: it.location,
          bullets: it.bullets,
        })) ||
      [];

    if (!experienceList || experienceList.length === 0) {
      issues.push({
        id: "missing-experience",
        severity: "error",
        rule: "SECTION_EXPERIENCE",
        message: "No work experience items found. Standard ATS parsers expect chronological work experience.",
        section: "experience",
      });
    } else {
      passedChecks.push(`Chronological experience found (${experienceList.length} roles)`);

      // Check each experience item
      let longBulletCount = 0;
      let metricBulletCount = 0;
      let totalBullets = 0;

      for (const exp of experienceList) {
        const companyName = exp.company || (exp as any).organization;
        const startDate = exp.startDate || (exp as any).start;
        const positionTitle = exp.position || (exp as any).role || "Untitled";

        if (!companyName) {
          issues.push({
            id: `missing-company-${exp.id}`,
            severity: "error",
            rule: "EXP_COMPANY",
            message: `Employer/Company name is missing for position "${positionTitle}".`,
            section: "experience",
          });
        }
        if (!startDate) {
          issues.push({
            id: `missing-date-${exp.id}`,
            severity: "warning",
            rule: "EXP_DATE",
            message: `Start date missing for ${companyName || "experience item"}. ATS parsers require dates to compute tenure.`,
            section: "experience",
          });
        }

        for (const bullet of exp.bullets) {
          totalBullets++;
          if (bullet.text.length > 300) {
            longBulletCount++;
          }
          if (/\d+[%xkm]?/i.test(bullet.text) || /\$(?:\d+)/i.test(bullet.text)) {
            metricBulletCount++;
          }

          // Check for passive or empty buzzwords
          if (/^responsible for\b/i.test(bullet.text)) {
            issues.push({
              id: `passive-verb-${bullet.id}`,
              severity: "warning",
              rule: "ACTION_VERB",
              message: `Bullet begins with passive phrase "Responsible for". Use a strong action verb instead.`,
              section: "experience",
            });
          }
        }
      }

      if (longBulletCount > 0) {
        issues.push({
          id: "long-bullets",
          severity: "warning",
          rule: "BULLET_LENGTH",
          message: `${longBulletCount} bullets exceed 300 characters. Keep bullets concise (1-2 lines) for scannability.`,
          section: "experience",
        });
      } else {
        passedChecks.push("Bullet lengths are concise and scannable");
      }

      if (totalBullets > 0 && metricBulletCount / totalBullets < 0.3) {
        issues.push({
          id: "low-metric-density",
          severity: "info",
          rule: "QUANTIFIED_METRICS",
          message: "Fewer than 30% of bullets contain quantified metrics (%, $, numbers). Add metrics to strengthen impact.",
          section: "experience",
        });
      } else if (metricBulletCount > 0) {
        passedChecks.push(`Quantified metrics present in ${metricBulletCount} bullets`);
      }
    }

    // 3. Skills Section
    if (!doc.skills || doc.skills.length === 0) {
      issues.push({
        id: "missing-skills",
        severity: "warning",
        rule: "SECTION_SKILLS",
        message: "No dedicated skills found. A clean skills section improves ATS keyword parsing.",
        section: "skills",
      });
    } else {
      passedChecks.push(`Dedicated skills section with ${doc.skills.length} skills`);
    }

    // Compute ATS readiness score
    let score = 100;
    for (const issue of issues) {
      if (issue.severity === "error") score -= 20;
      else if (issue.severity === "warning") score -= 8;
      else if (issue.severity === "info") score -= 3;
    }
    score = Math.max(0, Math.min(100, score));

    return {
      score,
      issues,
      passedChecks,
    };
  }
}
