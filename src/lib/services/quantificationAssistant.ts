import { db } from "@/lib/db/client";
import { quantificationInterviews, bulletFacts, achievementBullets } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { QuantificationQuestion } from "@/types/bank";

export interface GeneratedQuestionPrompt {
  questionKey: string;
  promptQuestion: string;
  category: "scale" | "team" | "outcome" | "technical" | "user_adoption";
  suggestedUnit?: string;
  helpText: string;
}

export class QuantificationAssistantService {
  /**
   * Evaluates a bullet or entry description to identify unquantified dimensions
   * and generates targeted, contextual follow-up questions without fabricating data.
   */
  static analyzeAndGenerateQuestions(
    text: string,
    context?: string
  ): GeneratedQuestionPrompt[] {
    const combined = `${text} ${context || ""}`.toLowerCase();
    const questions: GeneratedQuestionPrompt[] = [];

    // Check 1: User / Traffic scale
    const hasUsers = /\b(\d+\s*(users|active|customers|participants|attendees|clients))\b/i.test(combined);
    const mentionsPlatformOrProject = /\b(app|website|platform|service|api|portal|tool|system|dashboard|hackathon)\b/i.test(combined);

    if (mentionsPlatformOrProject && !hasUsers) {
      if (combined.includes("hackathon") || combined.includes("competition")) {
        questions.push({
          questionKey: "hackathon_scale",
          promptQuestion: "How many participants or teams competed in the hackathon, and did your project place in the top ranks?",
          category: "scale",
          suggestedUnit: "participants",
          helpText: "e.g., '120 participants across 30 teams; won 2nd place overall'",
        });
      } else {
        questions.push({
          questionKey: "user_scale",
          promptQuestion: "Approximately how many users, clients, or requests did this project support?",
          category: "scale",
          suggestedUnit: "users",
          helpText: "e.g., '500+ daily active users' or '10,000 monthly page views'",
        });
      }
    }

    // Check 2: Team & individual contribution (PRD 18.4)
    const hasDetailedContribution = /\b(my role was|i was responsible for|i built|i designed|solo|team of \d+)\b/i.test(combined);
    if (!hasDetailedContribution && mentionsPlatformOrProject) {
      questions.push({
        questionKey: "team_contribution",
        promptQuestion: combined.includes("team")
          ? "How many members were on your team, and what was your specific individual contribution vs your teammates?"
          : "Were you working solo or in a team? What was your specific individual contribution?",
        category: "team",
        helpText: "e.g., 'Team of 4; I designed the database schema and built all backend auth APIs'",
      });
    }

    // Check 3: Performance, speed, or latency metrics
    const mentionsOptimization = /\b(optim|speed|fast|reduc|latency|improv|scale)\b/i.test(combined);
    const hasNumbers = /\b\d+(\.\d+)?%?\b/.test(combined);
    if (mentionsOptimization && !hasNumbers) {
      questions.push({
        questionKey: "performance_outcome",
        promptQuestion: "Can you estimate the measurable outcome or performance gain (e.g., % latency reduction, time saved)?",
        category: "outcome",
        suggestedUnit: "%",
        helpText: "e.g., 'Reduced query response time by ~35%' or 'Cut weekly manual reporting from 4 hours to 10 minutes'",
      });
    }

    // Check 4: Scope & key features implemented
    if (text.length < 50) {
      questions.push({
        questionKey: "implementation_scope",
        promptQuestion: "What key features or architectural components did you personally design and implement?",
        category: "technical",
        helpText: "e.g., 'JWT-based session authentication, Stripe checkout webhook handler, and automated email alerts'",
      });
    }

    return questions;
  }

  /**
   * Persists questions to the database for an entry or bullet
   */
  static async createQuestionsForBullet(
    userId: string,
    bulletId: string,
    entryId: string,
    text: string
  ): Promise<QuantificationQuestion[]> {
    const generated = this.analyzeAndGenerateQuestions(text);
    const results: QuantificationQuestion[] = [];

    for (const q of generated) {
      const id = `quant_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const [inserted] = await db
        .insert(quantificationInterviews)
        .values({
          id,
          userId,
          entryId,
          bulletId,
          questionKey: q.questionKey,
          promptQuestion: q.promptQuestion,
          status: "pending",
        })
        .returning();

      results.push(inserted as QuantificationQuestion);
    }

    return results;
  }

  /**
   * Records a user's answer, clearly distinguishing user-provided figures/estimates from verified facts,
   * and optionally converts it into a typed bullet fact without hallucination.
   */
  static async answerQuestion(
    userId: string,
    questionId: string,
    userResponse: string,
    metricEstimate?: number,
    metricUnit?: string,
    isVerified: boolean = false
  ): Promise<{ question: QuantificationQuestion; createdFact?: any }> {
    const [updatedQuestion] = await db
      .update(quantificationInterviews)
      .set({
        userResponse,
        metricEstimate: metricEstimate ?? null,
        metricUnit: metricUnit ?? null,
        isVerified,
        status: "answered",
      })
      .where(and(eq(quantificationInterviews.id, questionId), eq(quantificationInterviews.userId, userId)))
      .returning();

    if (!updatedQuestion) throw new Error("Question not found or unauthorized");

    let createdFact = null;
    const numEstimate =
      metricEstimate != null && !isNaN(Number(metricEstimate)) ? Number(metricEstimate) : null;

    if (updatedQuestion.bulletId && numEstimate !== null) {
      const factId = `bf_quant_${Date.now()}`;
      [createdFact] = await db
        .insert(bulletFacts)
        .values({
          id: factId,
          userId,
          bulletId: updatedQuestion.bulletId,
          entryId: null,
          factType: "metric",
          factKey: updatedQuestion.questionKey,
          valueText: `${numEstimate}${metricUnit || ""}`,
          valueNumber: numEstimate,
          unit: metricUnit || "",
          verificationStatus: isVerified ? "user_verified" : "unverified",
        })
        .returning();
    }

    return { question: updatedQuestion as QuantificationQuestion, createdFact };
  }

  /**
   * Fetches pending and answered questions for an entry or bullet
   */
  static async getQuestions(
    userId: string,
    bulletId?: string,
    entryId?: string
  ): Promise<QuantificationQuestion[]> {
    if (bulletId) {
      return (await db
        .select()
        .from(quantificationInterviews)
        .where(
          and(
            eq(quantificationInterviews.userId, userId),
            eq(quantificationInterviews.bulletId, bulletId)
          )
        )) as QuantificationQuestion[];
    }

    if (entryId) {
      return (await db
        .select()
        .from(quantificationInterviews)
        .where(
          and(
            eq(quantificationInterviews.userId, userId),
            eq(quantificationInterviews.entryId, entryId)
          )
        )) as QuantificationQuestion[];
    }

    return (await db
      .select()
      .from(quantificationInterviews)
      .where(eq(quantificationInterviews.userId, userId))) as QuantificationQuestion[];
  }
}
