import { JDAnalysis } from "@/types/job";
import { BankEntry, AchievementBullet, BulletFact } from "@/types/bank";
import { SkillsRoadmapItem } from "@/types/job";

export interface CompleteSkillsRoadmap {
  jobId: string;
  strongEvidenceSkills: SkillsRoadmapItem[];
  limitedEvidenceSkills: SkillsRoadmapItem[];
  unrecordedSkills: SkillsRoadmapItem[];
  summary: {
    strongCount: number;
    limitedCount: number;
    unrecordedCount: number;
    recommendationMessage: string;
  };
}

export class SkillsRoadmapEngine {
  /**
   * Generates an honest, evidence-based skills gap analysis and actionable learning roadmap
   * without assigning misleading arbitrary percentage or numerical proficiency scores.
   */
  static generateRoadmap(
    jdAnalysis: JDAnalysis,
    bankEntries: BankEntry[],
    bullets: AchievementBullet[],
    facts: BulletFact[]
  ): CompleteSkillsRoadmap {
    // Collect all candidate mentions and evidenced facts
    const verifiedTools = new Set<string>();
    const bulletsCountMap = new Map<string, number>();

    for (const f of facts) {
      if (f.factType === "tool" || f.factType === "technology") {
        const val = f.valueText.toLowerCase().trim();
        verifiedTools.add(val);
      }
    }

    const fullBulletsText = bullets.map((b) => b.text.toLowerCase()).join(" \n ");
    for (const b of bullets) {
      const lower = b.text.toLowerCase();
      lower.split(/[\s,;()]+/).forEach((word) => {
        const clean = word.replace(/^[.]+|[.]+$/g, "");
        if (clean.length > 1) {
          bulletsCountMap.set(clean, (bulletsCountMap.get(clean) || 0) + 1);
        }
      });
    }

    const profileText = bankEntries
      .map((e) => `${e.title} ${e.descriptionContext || ""}`)
      .join(" ")
      .toLowerCase();

    const strongEvidenceSkills: SkillsRoadmapItem[] = [];
    const limitedEvidenceSkills: SkillsRoadmapItem[] = [];
    const unrecordedSkills: SkillsRoadmapItem[] = [];

    for (const kw of jdAnalysis.keywords) {
      const canonical = kw.canonical.toLowerCase();
      let bulletMentions = bulletsCountMap.get(canonical) || 0;
      if (bulletMentions === 0 && canonical.includes(" ")) {
        const escaped = canonical.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const phraseMatches = fullBulletsText.match(new RegExp(`\\b${escaped}\\b`, "gi"));
        bulletMentions = phraseMatches ? phraseMatches.length : 0;
      }
      const isVerifiedFact = verifiedTools.has(canonical);

      let evidenceGrade: "strong_evidence" | "limited_evidence" | "unrecorded" = "unrecorded";
      let isGenuineGap = true;

      if (isVerifiedFact || bulletMentions >= 2) {
        evidenceGrade = "strong_evidence";
        isGenuineGap = false;
      } else if (bulletMentions === 1 || profileText.includes(canonical)) {
        evidenceGrade = "limited_evidence";
        isGenuineGap = false;
      } else {
        evidenceGrade = "unrecorded";
        isGenuineGap = true;
      }

      const item: SkillsRoadmapItem = {
        skillName: kw.canonical,
        category: kw.category,
        evidenceGrade,
        isGenuineGap,
        learningResources: this.getCuratedResources(kw.canonical),
        practicalProjectIdeas: this.getPracticalProjectIdeas(kw.canonical),
      };

      if (evidenceGrade === "strong_evidence") {
        strongEvidenceSkills.push(item);
      } else if (evidenceGrade === "limited_evidence") {
        limitedEvidenceSkills.push(item);
      } else {
        unrecordedSkills.push(item);
      }
    }

    return {
      jobId: (jdAnalysis as any).jobId || "current-job",
      strongEvidenceSkills,
      limitedEvidenceSkills,
      unrecordedSkills,
      summary: {
        strongCount: strongEvidenceSkills.length,
        limitedCount: limitedEvidenceSkills.length,
        unrecordedCount: unrecordedSkills.length,
        recommendationMessage:
          unrecordedSkills.length === 0
            ? "Outstanding alignment! All job skills are backed by verifiable evidence in your Data Bank."
            : `${strongEvidenceSkills.length} skills strongly evidenced. Focus practical learning on the ${unrecordedSkills.length} unrecorded area(s) below.`,
      },
    };
  }

  private static getCuratedResources(skill: string): Array<{
    title: string;
    url?: string;
    type: "docs" | "tutorial" | "book" | "course";
  }> {
    const s = skill.toLowerCase();
    if (s.includes("rust")) {
      return [
        { title: "The Rust Programming Language (The Book)", url: "https://doc.rust-lang.org/book/", type: "book" },
        { title: "Rust by Example", url: "https://doc.rust-lang.org/rust-by-example/", type: "docs" },
      ];
    }
    if (s.includes("postgres") || s.includes("sql")) {
      return [
        { title: "PostgreSQL Official Documentation", url: "https://www.postgresql.org/docs/", type: "docs" },
        { title: "Use The Index, Luke (SQL Indexing Guide)", url: "https://use-the-index-luke.com/", type: "tutorial" },
      ];
    }
    if (s.includes("kafka") || s.includes("stream")) {
      return [
        { title: "Apache Kafka Documentation & Quickstart", url: "https://kafka.apache.org/documentation/", type: "docs" },
        { title: "Confluent Kafka Architecture Fundamentals", url: "https://developer.confluent.io/", type: "tutorial" },
      ];
    }
    if (s.includes("kube") || s.includes("k8s")) {
      return [
        { title: "Kubernetes The Hard Way", url: "https://github.com/kelseyhightower/kubernetes-the-hard-way", type: "tutorial" },
        { title: "Kubernetes Official Docs", url: "https://kubernetes.io/docs/home/", type: "docs" },
      ];
    }
    return [
      { title: `${skill} Official Documentation & Guides`, type: "docs" },
      { title: `Building Production Architectures with ${skill}`, type: "tutorial" },
    ];
  }

  private static getPracticalProjectIdeas(skill: string): string[] {
    const s = skill.toLowerCase();
    if (s.includes("kafka") || s.includes("event")) {
      return [
        "Build an event-driven pub/sub telemetry ingest pipeline processing mock sensor data with consumer groups.",
        "Implement transactional outbox pattern with Change Data Capture (CDC) to Kafka.",
      ];
    }
    if (s.includes("postgres") || s.includes("sql")) {
      return [
        "Design a multi-tenant partitioned schema with custom composite indexes and run EXPLAIN ANALYZE benchmarks.",
        "Implement optimistic concurrency control and serializable transactions for an e-commerce inventory ledger.",
      ];
    }
    if (s.includes("kube") || s.includes("docker")) {
      return [
        "Package a multi-container microservice with Helm charts, horizontal pod autoscaling (HPA), and health probes.",
      ];
    }
    return [
      `Build a focused proof-of-concept prototype solving a real workflow problem using ${skill}.`,
      `Implement automated integration tests and GitHub Actions CI for a ${skill}-based service.`,
    ];
  }
}
