import { describe, it, expect } from "vitest";
import { ResumeDocStore } from "@/lib/editor/resumeDocStore";
import { AtsLinter } from "@/lib/editor/atsLinter";
import { AutoFitLadder } from "@/lib/editor/autoFitLadder";
import { PlainTextSerializer } from "@/lib/export/plainTextSerializer";
import { DocxGenerator } from "@/lib/export/docxGenerator";
import { ResumeDoc } from "@/types/resume";

describe("Milestone M4: Resume Editor, Templates & Export Verification", () => {
  const sampleDoc: ResumeDoc = {
    schemaVersion: 1,
    documentId: "res_test_1",
    versionId: "ver_test_1",
    profile: {
      name: "Jordan Lee",
      fullName: "Jordan Lee",
      headline: "Principal Systems Architect",
      summary: "Accomplished architect with 10+ years designing distributed high-concurrency systems.",
      email: "jordan.lee@example.com",
      phone: "+1 555-0182",
      location: "Austin, TX",
      links: [{ label: "GitHub", url: "https://github.com/jordanlee" }],
    },
    sections: [],
    template: {
      id: "classic-ats",
      version: "1.0",
      theme: {},
    },
    page: {
      size: "LETTER",
      targetPages: 1,
    },
    metadata: {
      createdAt: new Date().toISOString(),
    },
    experience: [
      {
        id: "exp_1",
        company: "Stripe",
        position: "Staff Software Engineer",
        startDate: "2021",
        endDate: null,
        isCurrent: true,
        location: "Remote",
        bullets: [
          {
            id: "b_1",
            text: "Engineered distributed settlement pipeline processing $50M daily with 99.999% reliability.",
            provenance: "bank",
            sourceBulletIds: ["src_b1"],
            sourceFactIds: ["src_f1"],
            validatorStatus: "passed",
          },
        ],
      },
    ],
    education: [
      {
        id: "edu_1",
        institution: "Carnegie Mellon University",
        degree: "M.S.",
        field: "Computer Science",
        startDate: "2015",
        endDate: "2017",
      },
    ],
    skills: [{ name: "Distributed Systems" }, { name: "Rust" }, { name: "Go" }],
    projects: [
      {
        id: "proj_1",
        name: "AsyncRaft",
        role: "Creator",
        url: "https://github.com/jordanlee/asyncraft",
        description: "Zero-dependency Raft consensus implementation in Rust.",
        bullets: [
          {
            id: "pb_1",
            text: "Achieved sub-millisecond roundtrips with io_uring networking.",
            provenance: "manual",
            sourceBulletIds: [],
            sourceFactIds: [],
            validatorStatus: "not_applicable",
          },
        ],
      },
    ],
    certifications: [
      {
        id: "cert_1",
        name: "AWS Certified Solutions Architect - Professional",
        issuer: "Amazon Web Services",
        issueDate: "2023",
      },
    ],
  };

  // 1. ResumeDocStore Tests
  describe("ResumeDocStore Reactive State & Undo/Redo", () => {
    it("updates profile and tracks history stack", () => {
      const store = new ResumeDocStore(sampleDoc);
      expect(store.getState().isDirty).toBe(false);

      store.updateProfile({ headline: "Senior Fellow" });
      expect(store.getState().doc.profile.headline).toBe("Senior Fellow");
      expect(store.getState().isDirty).toBe(true);
      expect(store.getState().past.length).toBe(1);

      // Undo
      store.undo();
      expect(store.getState().doc.profile.headline).toBe("Principal Systems Architect");
      expect(store.getState().future.length).toBe(1);

      // Redo
      store.redo();
      expect(store.getState().doc.profile.headline).toBe("Senior Fellow");
    });

    it("adds and updates experience bullets", () => {
      const store = new ResumeDocStore(sampleDoc);
      store.addExperienceBullet("exp_1", {
        id: "b_new",
        text: "New verified bullet.",
        provenance: "manual",
        sourceBulletIds: [],
        sourceFactIds: [],
        validatorStatus: "not_applicable",
      });

      const exp = store.getState().doc.experience?.find((e) => e.id === "exp_1");
      expect(exp?.bullets.length).toBe(2);
      expect(exp?.bullets[1].text).toBe("New verified bullet.");

      store.updateExperienceBullet("exp_1", "b_new", "Updated text.");
      const updatedExp = store.getState().doc.experience?.find((e) => e.id === "exp_1");
      expect(updatedExp?.bullets[1].text).toBe("Updated text.");
    });
  });

  // 2. ATS Linter Tests
  describe("AtsLinter Rules & Audit Scoring", () => {
    it("produces high ATS score for fully evidenced and well-formatted resume", () => {
      const report = AtsLinter.lint(sampleDoc);
      expect(report.score).toBeGreaterThanOrEqual(80);
      expect(report.passedChecks.some((c) => c.includes("Valid email"))).toBe(true);
      expect(report.passedChecks.some((c) => c.includes("Chronological experience"))).toBe(true);
    });

    it("detects missing contact details and passive verbs", () => {
      const badDoc: ResumeDoc = {
        ...sampleDoc,
        profile: {
          ...sampleDoc.profile,
          name: "",
          fullName: "",
          email: "invalid-email",
        },
        experience: [
          {
            id: "exp_bad",
            company: "Acme",
            position: "Developer",
            startDate: "2020",
            bullets: [
              {
                id: "b_bad",
                text: "Responsible for writing backend code.",
                provenance: "manual",
                sourceBulletIds: [],
                sourceFactIds: [],
                validatorStatus: "not_applicable",
              },
            ],
          },
        ],
      };

      const report = AtsLinter.lint(badDoc);
      expect(report.score).toBeLessThan(70);
      expect(report.issues.some((i) => i.rule === "CONTACT_FULLNAME")).toBe(true);
      expect(report.issues.some((i) => i.rule === "CONTACT_EMAIL")).toBe(true);
      expect(report.issues.some((i) => i.rule === "ACTION_VERB")).toBe(true);
    });
  });

  // 3. Auto-Fit Ladder Tests
  describe("AutoFitLadder Deterministic Steps", () => {
    it("respects typography floors and reduces margins on higher steps", () => {
      const step1 = AutoFitLadder.evaluateFit(sampleDoc, 1);
      expect(step1.fontSizePt).toBe(10.5);
      expect(step1.marginInches).toBe(0.75);

      const step5 = AutoFitLadder.evaluateFit(sampleDoc, 5);
      expect(step5.marginInches).toBe(0.5);
      expect(step5.fontSizePt).toBeGreaterThanOrEqual(9.0); // Never below 9pt floor
    });
  });

  // 4. PlainTextSerializer Tests
  describe("PlainTextSerializer Clean Export", () => {
    it("serializes all sections into clean readable plain text", () => {
      const text = PlainTextSerializer.serialize(sampleDoc);
      expect(text).toContain("JORDAN LEE");
      expect(text).toContain("jordan.lee@example.com");
      expect(text).toContain("PROFESSIONAL EXPERIENCE");
      expect(text).toContain("Stripe");
      expect(text).toContain("$50M daily");
      expect(text).toContain("EDUCATION");
      expect(text).toContain("Carnegie Mellon University");
      expect(text).toContain("TECHNICAL & PROFESSIONAL SKILLS");
    });
  });

  // 5. DocxGenerator Tests
  describe("DocxGenerator Client-Side Blob Generation", () => {
    it("generates a valid DOCX blob from canonical ResumeDoc", async () => {
      const blob = await DocxGenerator.generateDocxBlob(sampleDoc);
      expect(blob).toBeDefined();
      expect(blob.size).toBeGreaterThan(1000);
      expect(blob.type).toContain("wordprocessingml");
    });
  });
});
