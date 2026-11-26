import { db } from "@/lib/db/client";
import {
  achievementBullets,
  bankEntries,
  bulletFacts,
  coverLetters,
  jdAnalyses,
  users,
} from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { ApplicationService } from "./applicationService";
import { BulletRetriever } from "@/lib/tailoring/bulletRetriever";
import { GapReportEngine, GapReport } from "@/lib/scoring/gapReportEngine";
import { ProviderFactory } from "@/lib/ai/providerFactory";
import { CanaryDetector } from "@/lib/intelligence/canaryDetector";
import { BankEntry, AchievementBullet, StructuredFact } from "@/types/bank";
import { JDAnalysis } from "@/types/job";
import { ResumeDoc } from "@/types/resume";
import { computeStaleStageInfo } from "@/lib/utils/applicationStageUtils";

export interface StarStoryItem {
  id: string;
  bulletId: string;
  entryId: string;
  entryTitle: string;
  organization: string | null;
  dates: string;
  situation: string;
  task: string;
  action: string;
  result: string | null;
  citedMetrics: string[];
  citedTools: string[];
  matchedKeywords: string[];
  needsMetricPrompt: boolean;
}

export interface PrepQuestionItem {
  id: string;
  category: "gap_in_vault" | "gap_unverified" | "gap_missing" | "round_core";
  keyword?: string;
  roundFocus: string;
  question: string;
  groundedCue: string;
}

export { computeStaleStageInfo } from "@/lib/utils/applicationStageUtils";
export type { StaleStageInfo } from "@/lib/utils/applicationStageUtils";

export function buildStarAndQuestionPrep(params: {
  jobTitle: string;
  company: string;
  entries: BankEntry[];
  jdAnalysis?: JDAnalysis;
  gapReport?: GapReport;
  rounds?: Array<{ roundName: string; status: string }>;
}): { starStories: StarStoryItem[]; questionChecklist: PrepQuestionItem[] } {
  const { jobTitle, company, entries, jdAnalysis, gapReport, rounds = [] } = params;

  const syntheticJd: JDAnalysis = jdAnalysis || {
    schemaVersion: 1,
    role: {
      title: jobTitle || "Target Role",
      company: company || null,
      seniority: "unknown",
      domain: [],
      location: null,
      workMode: "unknown",
      yearsExperience: { min: null, max: null },
      education: [],
    },
    keywords: [],
    responsibilities: [],
    constraints: [],
    ambiguityFlags: [],
    confidence: 0.7,
    sourceTextHash: "prep",
    promptVersion: "v1",
  };

  const retrieval = BulletRetriever.retrieveCandidates(entries, syntheticJd, 5000);

  const starStories: StarStoryItem[] = retrieval.candidates.slice(0, 5).map((cand, idx) => {
    const entry = cand.parentEntry;
    const facts = cand.facts || cand.bullet.facts || [];
    const dates = `${entry.startDate || "Prior"} – ${entry.isCurrent ? "Present" : entry.endDate || "Present"}`;

    const citedMetrics = facts
      .filter((f) => f.factType === "metric" || f.factType === "outcome")
      .map((f) => f.valueText);

    // Also include explicit numbers already present in the verified bullet text
    const textNums = cand.bullet.text.match(/\b\d+(?:[.,]\d+)?\s*(?:%|ms|s|x|k|m|b|\+)?\b/gi) || [];
    for (const num of textNums) {
      if (num.trim().length > 1 && !citedMetrics.includes(num.trim())) {
        citedMetrics.push(num.trim());
      }
    }

    const citedTools = facts
      .filter((f) => f.factType === "tool" || f.factType === "technology")
      .map((f) => f.valueText);

    const matchedKeywords = cand.scoreBreakdown.matchedKeywords || [];
    const hasMetrics = citedMetrics.length > 0;

    return {
      id: `star_${idx + 1}_${cand.bullet.id}`,
      bulletId: cand.bullet.id,
      entryId: entry.id,
      entryTitle: entry.title,
      organization: entry.organization || null,
      dates,
      situation: `${entry.title}${entry.organization ? ` at ${entry.organization}` : ""} (${dates})${entry.descriptionContext ? ` — ${entry.descriptionContext}` : ""}`,
      task:
        matchedKeywords.length > 0
          ? `Demonstrate verified depth in ${matchedKeywords.slice(0, 4).join(", ")} aligned with ${jobTitle || "this role"}.`
          : `Execute core deliverables for ${entry.title}.`,
      action: cand.bullet.text,
      result: hasMetrics ? `Verified outcome evidence: ${citedMetrics.join(", ")}` : null,
      citedMetrics,
      citedTools,
      matchedKeywords,
      needsMetricPrompt: !hasMetrics,
    };
  });

  const questionChecklist: PrepQuestionItem[] = [];

  if (gapReport) {
    for (const g of gapReport.inBankNotOnResume.slice(0, 3)) {
      const refBullet = g.suggestedBullets?.[0]?.text;
      questionChecklist.push({
        id: `q_bank_${g.keyword.canonical}`,
        category: "gap_in_vault",
        keyword: g.keyword.canonical,
        roundFocus: "Technical / Experience Deep-Dive",
        question: `Your tailored resume didn't highlight "${g.keyword.canonical}", though it is in your Career Vault. How did you apply it in production?`,
        groundedCue: refBullet
          ? `Cite verified Vault evidence: "${refBullet}"`
          : `Walk through your verified Career Vault project involving ${g.keyword.canonical}.`,
      });
    }

    for (const g of gapReport.inProfileUnverified.slice(0, 3)) {
      questionChecklist.push({
        id: `q_unverified_${g.keyword.canonical}`,
        category: "gap_unverified",
        keyword: g.keyword.canonical,
        roundFocus: "Metric & Scope Verification",
        question: `Prepare concrete scope, trade-offs, and verified outcomes for "${g.keyword.canonical}".`,
        groundedCue: `"${g.keyword.canonical}" is listed in your profile without a quantified bullet yet—stick strictly to your real scope.`,
      });
    }

    for (const g of gapReport.missingFromBank.slice(0, 3)) {
      questionChecklist.push({
        id: `q_missing_${g.keyword.canonical}`,
        category: "gap_missing",
        keyword: g.keyword.canonical,
        roundFocus: "Gap Handling & Learning Velocity",
        question: `If asked about "${g.keyword.canonical}" (not yet in your Career Vault), how will you bridge cleanly without overclaiming?`,
        groundedCue: `Acknowledge what you haven't used directly yet and connect to adjacent verified tools in your Vault.`,
      });
    }
  }

  // Round-specific grounded checklist prompts
  const roundNames = rounds.length > 0 ? rounds.map((r) => r.roundName) : ["Recruiter Screen", "Technical / Behavioral"];
  for (const rName of roundNames.slice(0, 3)) {
    questionChecklist.push({
      id: `q_round_${rName.toLowerCase().replace(/\W+/g, "_")}`,
      category: "round_core",
      roundFocus: rName,
      question: `Walk the ${company || "hiring"} interviewer (${rName}) through your strongest XYZ story for ${jobTitle || "this role"}.`,
      groundedCue:
        starStories[0]?.action ||
        "Select one verified bullet above and rehearse Situation, Action, and exact verified Result.",
    });
  }

  return { starStories, questionChecklist };
}

export class InterviewPrepService {
  static async generateApplicationPrep(userId: string, applicationId: string) {
    const app = await ApplicationService.getApplication(userId, applicationId);
    if (!app) {
      throw new Error("Application not found");
    }

    const [entriesRaw, bulletsRaw, factsRaw, jdRows] = await Promise.all([
      db
        .select()
        .from(bankEntries)
        .where(and(eq(bankEntries.userId, userId), isNull(bankEntries.deletedAt))),
      db
        .select()
        .from(achievementBullets)
        .where(and(eq(achievementBullets.userId, userId), isNull(achievementBullets.deletedAt))),
      db.select().from(bulletFacts).where(eq(bulletFacts.userId, userId)),
      app.jobId
        ? db
            .select()
            .from(jdAnalyses)
            .where(and(eq(jdAnalyses.userId, userId), eq(jdAnalyses.jobId, app.jobId)))
            .limit(1)
        : Promise.resolve([]),
    ]);

    const factsByBullet = new Map<string, StructuredFact[]>();
    for (const f of factsRaw) {
      if (!f.bulletId) continue;
      const list = factsByBullet.get(f.bulletId) || [];
      list.push(f as unknown as StructuredFact);
      factsByBullet.set(f.bulletId, list);
    }

    const bulletsByEntry = new Map<string, AchievementBullet[]>();
    for (const b of bulletsRaw) {
      const bObj: AchievementBullet = {
        ...(b as unknown as AchievementBullet),
        facts: factsByBullet.get(b.id) || [],
      };
      const list = bulletsByEntry.get(b.entryId) || [];
      list.push(bObj);
      bulletsByEntry.set(b.entryId, list);
    }

    const entries: BankEntry[] = entriesRaw.map((e) => ({
      ...(e as unknown as BankEntry),
      bullets: bulletsByEntry.get(e.id) || [],
    }));

    const jdAnalysis = (jdRows[0]?.analysisJson as unknown as JDAnalysis | undefined) || undefined;
    const resumeDoc = (app.versionDocJson as unknown as ResumeDoc | undefined) || {
      schemaVersion: 1,
      documentId: "empty",
      versionId: "empty",
      profile: { name: "", links: [] },
      sections: [],
      template: { id: "classic-ats", version: "1.0", theme: {} },
      page: { size: "A4", targetPages: 1 },
      metadata: { createdAt: new Date().toISOString() },
      experience: [],
      education: [],
      skills: [],
      projects: [],
    };

    const gapReport = jdAnalysis
      ? GapReportEngine.generateReport(resumeDoc, jdAnalysis, entries)
      : undefined;

    const { starStories, questionChecklist } = buildStarAndQuestionPrep({
      jobTitle: app.jobTitle || "Target Role",
      company: app.jobCompany || "Company",
      entries,
      jdAnalysis,
      gapReport,
      rounds: app.interviews || [],
    });

    return {
      applicationId,
      jobTitle: app.jobTitle || "Target Role",
      company: app.jobCompany || "Company",
      stageInfo: computeStaleStageInfo(app),
      starStories,
      questionChecklist,
      gapSummary: gapReport
        ? {
            totalMissingCount: gapReport.totalMissingCount,
            inBankNotOnResumeCount: gapReport.inBankNotOnResume.length,
            inProfileUnverifiedCount: gapReport.inProfileUnverified.length,
            missingFromBankCount: gapReport.missingFromBank.length,
          }
        : null,
    };
  }

  static async generateFollowUpDraft(
    userId: string,
    applicationId: string,
    options: {
      kind?: "follow_up" | "thank_you";
      roundId?: string;
      saveToCoverLetters?: boolean;
    } = {}
  ) {
    const app = await ApplicationService.getApplication(userId, applicationId);
    if (!app) {
      throw new Error("Application not found");
    }

    const kind = options.kind || (app.interviews?.length ? "thank_you" : "follow_up");
    const targetRound = options.roundId
      ? app.interviews?.find((i) => i.id === options.roundId)
      : app.interviews?.[app.interviews.length - 1];

    const [[user], entriesRaw, bulletsRaw] = await Promise.all([
      db
        .select({ displayName: users.displayName, email: users.email, contactEmail: users.contactEmail })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1),
      db
        .select()
        .from(bankEntries)
        .where(and(eq(bankEntries.userId, userId), isNull(bankEntries.deletedAt))),
      db
        .select()
        .from(achievementBullets)
        .where(and(eq(achievementBullets.userId, userId), isNull(achievementBullets.deletedAt))),
    ]);

    const entryMap = new Map(entriesRaw.map((e) => [e.id, e]));
    const topEvidence = bulletsRaw.slice(0, 3).map((b) => ({
      text: b.text,
      role: entryMap.get(b.entryId)?.title || "",
      org: entryMap.get(b.entryId)?.organization || "",
    }));

    const roleTitle = app.jobTitle || "the open role";
    const companyName = app.jobCompany || "your team";
    const candidateName = user?.displayName || "Candidate";
    const interviewerLine = targetRound?.interviewers
      ? `Dear ${targetRound.interviewers},`
      : `Dear ${companyName} Hiring Team,`;

    const canaryScan = CanaryDetector.detectCanaryTraps(app.jobRawText || "");

    const title =
      kind === "thank_you"
        ? `Thank You — ${targetRound?.roundName || "Interview"} (${companyName})`
        : `Follow-Up — ${app.jobTitle || "Application"} (${companyName})`;

    const provider = ProviderFactory.getProvider(undefined, undefined, "reasoning", user?.email || null);
    let content = "";

    if (provider.name !== "local-deterministic") {
      try {
        const res = await provider.generateStructured<{ subject?: string; content: string }>({
          task: "cover_letter",
          systemPrompt: `Write a concise, professional ${kind === "thank_you" ? "post-interview thank-you" : "application status follow-up"} email.
STRICT TRUTH RULES:
1. Only mention achievements explicitly given in topEvidence. Never fabricate metrics, tools, or claims.
2. Never echo canary/trap tokens: ${canaryScan.quarantinedKeywords.join(", ") || "none"}.
3. Keep under 170 words.
4. Return JSON { "content": string }.`,
          userPayload: {
            kind,
            candidateName,
            roleTitle,
            companyName,
            stage: app.status,
            appliedAt: app.appliedAt,
            round: targetRound
              ? {
                  roundName: targetRound.roundName,
                  interviewers: targetRound.interviewers,
                  prepNotes: targetRound.prepNotes,
                }
              : null,
            topEvidence,
          },
          schema: {},
          maxOutputTokens: 320,
          temperature: 0.2,
        });
        if (res?.data?.content) {
          content = res.data.content;
        }
      } catch {
        // Fall through to deterministic truth-grounded template
      }
    }

    if (!content) {
      const highlight = topEvidence[0]
        ? `In particular, my experience${topEvidence[0].org ? ` at ${topEvidence[0].org}` : ""} (${topEvidence[0].text}) aligns directly with what the team is focused on.`
        : `My background aligns closely with the responsibilities outlined for ${roleTitle}.`;

      if (kind === "thank_you") {
        content = `${interviewerLine}

Thank you for taking the time to speak with me during the ${targetRound?.roundName || "interview"} for the ${roleTitle} position at ${companyName}.

I appreciated learning more about the team's priorities. ${highlight}

Please let me know if any additional context from my work would be helpful as you evaluate next steps.

Best regards,
${candidateName}`;
      } else {
        const appliedDateStr = app.appliedAt
          ? ` on ${new Date(app.appliedAt).toLocaleDateString()}`
          : "";
        content = `${interviewerLine}

I hope you are doing well. I am writing to check in on my application for the ${roleTitle} role at ${companyName}${appliedDateStr}.

I remain very interested in contributing to ${companyName}. ${highlight}

Thank you for your time and consideration—I would welcome the opportunity to discuss how I can help the team.

Best regards,
${candidateName}`;
      }
    }

    let savedCoverLetterId: string | null = null;
    if (options.saveToCoverLetters !== false) {
      const clId = `cl_${crypto.randomUUID()}`;
      await db.insert(coverLetters).values({
        id: clId,
        userId,
        jobId: app.jobId || null,
        applicationId,
        title,
        content,
        tone: "concise",
      });
      savedCoverLetterId = clId;
    }

    return {
      applicationId,
      kind,
      title,
      content,
      savedCoverLetterId,
    };
  }
}
