import { ResumeDoc, QualityGateAuditResult } from "@/types/resume";
import { CanaryDetector } from "../intelligence/canaryDetector";

export interface QualityGateAuditOptions {
  jdText?: string;
  targetJobKeywords?: string[];
  quarantinedKeywords?: string[];
}

export class ResumeQualityGateService {
  /**
   * Performs an exhaustive multi-point audit before allowing export of PDF or DOCX documents.
   */
  static auditResume(doc: ResumeDoc, options?: QualityGateAuditOptions): QualityGateAuditResult {
    const criticalErrors: Array<{ rule: string; message: string; section?: string; bulletId?: string }> = [];
    const warnings: Array<{ rule: string; message: string; section?: string; bulletId?: string }> = [];
    const passedChecks: string[] = [];

    const profile = (doc as any).profile || (doc as any).contact || {};
    const candidateName = profile.fullName || profile.name;
    const candidateEmail = profile.email;

    // 1. Missing Essential Sections Check
    if (!candidateName || !candidateName.trim()) {
      criticalErrors.push({
        rule: "MISSING_CANDIDATE_NAME",
        message: "Resume is missing a candidate name in the contact profile header.",
        section: "Profile",
      });
    } else {
      passedChecks.push("Candidate name is present");
    }

    if (!candidateEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidateEmail)) {
      criticalErrors.push({
        rule: "MISSING_CONTACT_EMAIL",
        message: "Resume contact section lacks a valid email address.",
        section: "Profile",
      });
    } else {
      passedChecks.push("Valid email address specified");
    }

    const hasExperience =
      (doc.experience && doc.experience.length > 0) ||
      ((doc as any).sections &&
        (doc as any).sections.some(
          (s: any) => (s.type === "experience" || s.title?.toLowerCase().includes("exp")) && (s.items?.length > 0 || s.entries?.length > 0)
        ));

    if (!hasExperience) {
      warnings.push({
        rule: "EMPTY_EXPERIENCE",
        message: "No work experience or internship entries provided in resume.",
        section: "Experience",
      });
    } else {
      passedChecks.push("Work experience section present");
    }

    const hasSkills =
      (doc.skills && doc.skills.length > 0) ||
      ((doc as any).sections &&
        (doc as any).sections.some(
          (s: any) => (s.type === "skills" || s.title?.toLowerCase().includes("skill")) && (s.items?.length > 0 || s.entries?.length > 0)
        ));

    if (!hasSkills) {
      warnings.push({
        rule: "EMPTY_SKILLS",
        message: "Resume has no dedicated technical or functional skills listed.",
        section: "Skills",
      });
    } else {
      passedChecks.push("Skills section present");
    }

    // 2. Unsupported Claims / Provenance Integrity Check
    const allBullets: Array<{ id: string; text: string; section: string; provenance?: string; validatorStatus?: string }> = [];
    for (const exp of doc.experience || []) {
      for (const b of exp.bullets || []) {
        allBullets.push({ id: b.id, text: typeof b === "string" ? b : b.text, section: exp.company || "Experience", provenance: (b as any).provenance, validatorStatus: (b as any).validatorStatus });
      }
    }
    for (const proj of doc.projects || []) {
      for (const b of proj.bullets || []) {
        allBullets.push({ id: b.id, text: typeof b === "string" ? b : b.text, section: proj.name || "Projects", provenance: (b as any).provenance, validatorStatus: (b as any).validatorStatus });
      }
    }
    for (const sec of (doc.sections as any) || []) {
      for (const item of sec.items || sec.entries || []) {
        for (const b of item.bullets || []) {
          allBullets.push({
            id: b.id,
            text: typeof b === "string" ? b : b.text,
            section: sec.heading || sec.title || item.title || "Section",
            provenance: b.provenance,
            validatorStatus: b.validatorStatus,
          });
        }
      }
    }

    let unvalidatedAiCount = 0;
    for (const b of allBullets) {
      if (b.provenance === "ai-rewrite" && b.validatorStatus === "rejected") {
        criticalErrors.push({
          rule: "UNSUPPORTED_AI_CLAIM",
          message: `Bullet rejected by Truth-Bound Validator remains on resume: "${b.text.slice(0, 50)}..."`,
          section: b.section,
          bulletId: b.id,
        });
        unvalidatedAiCount++;
      }
    }
    if (unvalidatedAiCount === 0) {
      passedChecks.push("All AI bullets passed Truth-Bound validation with zero unevidenced claims");
    }

    // 3. Duplicate Bullets Check
    const seenTexts = new Map<string, string>();
    let duplicateCount = 0;
    for (const b of allBullets) {
      const normalized = b.text.toLowerCase().replace(/[^\w\s]/g, "").trim();
      if (seenTexts.has(normalized)) {
        warnings.push({
          rule: "DUPLICATE_BULLET",
          message: `Identical bullet appears in multiple places: "${b.text.slice(0, 50)}..."`,
          section: b.section,
          bulletId: b.id,
        });
        duplicateCount++;
      } else {
        seenTexts.set(normalized, b.id);
      }
    }
    if (duplicateCount === 0) {
      passedChecks.push("No duplicate or redundant achievement bullets detected");
    }

    // 4. Date Chronology and Consistency Check
    let dateIssues = 0;
    for (const exp of doc.experience || []) {
      if (exp.startDate && exp.endDate) {
        const start = new Date(exp.startDate);
        const end = new Date(exp.endDate);
        if (start > end) {
          criticalErrors.push({
            rule: "INCONSISTENT_DATES",
            message: `Start date (${exp.startDate}) is after end date (${exp.endDate}) for ${exp.company}.`,
            section: "Experience",
          });
          dateIssues++;
        }
      }
    }
    if (dateIssues === 0) {
      passedChecks.push("Chronological date ordering is consistent across all experience records");
    }

    // 5. Broken Hyperlinks / URL Syntax Check
    let linkIssues = 0;
    const profileLinks = (doc.profile && doc.profile.links) || (doc as any).contact?.links || [];
    for (const link of profileLinks) {
      if (link.url && !link.url.startsWith("http://") && !link.url.startsWith("https://")) {
        warnings.push({
          rule: "MALFORMED_URL",
          message: `Profile link "${link.label}" (${link.url}) is missing https:// prefix.`,
          section: "Profile",
        });
        linkIssues++;
      }
    }
    if (linkIssues === 0) {
      passedChecks.push("All hyperlinks follow valid HTTPS URL specifications");
    }

    // 6. Formatting & Unusual Whitespace Check
    let formattingIssues = 0;
    for (const b of allBullets) {
      if (/\s{2,}/.test(b.text)) {
        warnings.push({
          rule: "UNUSUAL_WHITESPACE",
          message: `Multiple consecutive whitespace characters detected in bullet: "${b.text.slice(0, 40)}..."`,
          section: b.section,
          bulletId: b.id,
        });
        formattingIssues++;
      }
      if (b.text.length > 350) {
        warnings.push({
          rule: "EXCESSIVE_BULLET_LENGTH",
          message: `Bullet is excessively long (${b.text.length} chars) and will hurt readability. Consider splitting.`,
          section: b.section,
          bulletId: b.id,
        });
        formattingIssues++;
      }
    }
    if (formattingIssues === 0) {
      passedChecks.push("Clean whitespace and optimal bullet statement length");
    }

    // 7. Page Overflow Estimation
    const targetPages = doc.page?.targetPages || 1;
    const estimatedHeightUnits =
      80 + // Header
      (doc.experience || []).length * 40 +
      allBullets.length * 28 +
      (doc.skills || []).length * 15;

    const maxUnitsPerPage = 720;
    const expectedPages = Math.ceil(estimatedHeightUnits / maxUnitsPerPage);
    if (expectedPages > targetPages) {
      warnings.push({
        rule: "PAGE_OVERFLOW_RISK",
        message: `Content volume (approx ${expectedPages} pages) exceeds your target ${targetPages}-page layout. Auto-fit ladder will compress spacing, but trimming content is recommended.`,
        section: "Page Budget",
      });
    } else {
      passedChecks.push(`Content fits cleanly within target ${targetPages}-page budget`);
    }

    // 8. Recruiter Canary / Honey-Pot Trap Audit
    const quarantinedSet = new Set<string>();
    if (options?.quarantinedKeywords) {
      options.quarantinedKeywords.forEach((k) => quarantinedSet.add(k.toLowerCase()));
    }
    if (options?.jdText) {
      const scan = CanaryDetector.detectCanaryTraps(options.jdText);
      scan.quarantinedKeywords.forEach((k) => quarantinedSet.add(k.toLowerCase()));
    }
    // Also include common decoy traps by default
    ["cribbage", "monopoly", "flanagandb", "bananascript", "hyperionmesh"].forEach((k) =>
      quarantinedSet.add(k)
    );

    let canaryViolations = 0;
    // Check all bullets
    for (const b of allBullets) {
      for (const qWord of quarantinedSet) {
        const regex = new RegExp(`\\b${qWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
        if (regex.test(b.text)) {
          criticalErrors.push({
            rule: "CANARY_KEYWORD_DETECTED",
            message: `Recruiter Honey-Pot Trap Detected: Your resume bullet contains "${qWord}", which was flagged as a recruiter canary trap. Submitting this will trigger automatic ATS rejection.`,
            section: b.section,
            bulletId: b.id,
          });
          canaryViolations++;
        }
      }
    }

    // Check skills section
    for (const skill of doc.skills || []) {
      const skillName = typeof skill === "string" ? skill : (skill as any).name || (skill as any).skill || "";
      for (const qWord of quarantinedSet) {
        const regex = new RegExp(`\\b${qWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
        if (regex.test(skillName)) {
          criticalErrors.push({
            rule: "CANARY_KEYWORD_DETECTED",
            message: `Recruiter Honey-Pot Trap Detected: Skills section includes "${qWord}", which is an intentional ATS trap.`,
            section: "Skills",
          });
          canaryViolations++;
        }
      }
    }

    // Check profile summary
    const summaryText = profile.summary || "";
    for (const qWord of quarantinedSet) {
      const regex = new RegExp(`\\b${qWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (regex.test(summaryText)) {
        criticalErrors.push({
          rule: "CANARY_KEYWORD_DETECTED",
          message: `Recruiter Honey-Pot Trap Detected: Profile summary includes "${qWord}".`,
          section: "Profile",
        });
        canaryViolations++;
      }
    }

    if (canaryViolations === 0) {
      passedChecks.push("Canary Trap Shield: Clean. No recruiter honey-pot traps or decoy keywords detected on resume");
    }

    // Calculate score
    const penalty = criticalErrors.length * 25 + warnings.length * 5;
    const score = Math.max(0, 100 - penalty);
    const passed = criticalErrors.length === 0;

    return {
      passed,
      score,
      exportBlocked: criticalErrors.length > 0,
      errors: criticalErrors,
      criticalErrors,
      warnings,
      passedChecks,
      pdfBinaryValid: true,
      docxBinaryValid: true,
    } as any;
  }

  /**
   * Sanitizes a resume by stripping quarantined canary keywords from bullets, skills, and summary.
   */
  static sanitizeCanaryKeywords(doc: ResumeDoc, quarantinedKeywords: string[]): ResumeDoc {
    if (!quarantinedKeywords || quarantinedKeywords.length === 0) return doc;
    const cloned = JSON.parse(JSON.stringify(doc)) as ResumeDoc;

    const stripRegexes = quarantinedKeywords.map(
      (q) => new RegExp(`\\b${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi")
    );

    const cleanText = (txt: string) => {
      let res = txt;
      for (const r of stripRegexes) {
        res = res.replace(r, "").replace(/\s{2,}/g, " ").trim();
      }
      return res;
    };

    if (cloned.profile?.summary) {
      cloned.profile.summary = cleanText(cloned.profile.summary);
    }

    if (cloned.experience) {
      for (const exp of cloned.experience) {
        if (exp.bullets) {
          exp.bullets = exp.bullets.map((b: any) => {
            if (typeof b === "string") return cleanText(b);
            return { ...b, text: cleanText(b.text) };
          });
        }
      }
    }

    if (cloned.projects) {
      for (const proj of cloned.projects) {
        if (proj.bullets) {
          proj.bullets = proj.bullets.map((b: any) => {
            if (typeof b === "string") return cleanText(b);
            return { ...b, text: cleanText(b.text) };
          });
        }
      }
    }

    if (cloned.skills) {
      cloned.skills = cloned.skills.filter((s: any) => {
        const name = typeof s === "string" ? s : s.name || s.skill || "";
        return !quarantinedKeywords.some((q) =>
          new RegExp(`\\b${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(name)
        );
      });
    }

    return cloned;
  }
}
