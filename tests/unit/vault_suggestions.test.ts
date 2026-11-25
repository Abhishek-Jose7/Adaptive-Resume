import { describe, expect, it } from "vitest";
import {
  collectCatalogedSkills,
  collectEvidencedVaultTools,
  extractToolsFromText,
  getBulletSuggestions,
  getEntryFormSuggestions,
} from "@/lib/services/vaultSuggestionService";
import { BankEntry } from "@/types/bank";

function makeEntry(overrides: Partial<BankEntry>): BankEntry {
  return {
    id: overrides.id || "entry-1",
    userId: "user-1",
    entryType: overrides.entryType || "experience",
    title: overrides.title || "Software Engineer",
    organization: overrides.organization ?? "Acme Corp",
    location: overrides.location ?? "Mumbai, India",
    startDate: "2025-01-01",
    endDate: null,
    isCurrent: true,
    descriptionContext: overrides.descriptionContext ?? null,
    visibility: "private",
    verificationStatus: "unverified",
    sortOrder: 0,
    rowVersion: 1,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    bullets: overrides.bullets || [],
    facts: overrides.facts || [],
  };
}

describe("vaultSuggestionService", () => {
  it("extracts canonical technical tools from free text cleanly", () => {
    const tools = extractToolsFromText(
      "Built a FastAPI REST API with PostgreSQL, Docker, and XGBoost on AWS"
    );
    expect(tools).toEqual(
      expect.arrayContaining(["FastAPI", "REST APIs", "PostgreSQL", "Docker", "XGBoost", "AWS"])
    );
  });

  it("suggests uncataloged evidenced skills when editing a skill_group", () => {
    const expEntry = makeEntry({
      id: "exp-1",
      entryType: "experience",
      title: "Backend Intern",
      bullets: [
        {
          id: "b-1",
          userId: "user-1",
          entryId: "exp-1",
          text: "Engineered async endpoints using FastAPI, Redis, and PostgreSQL.",
          visibility: "private",
          verificationStatus: "unverified",
          usagePolicy: "eligible",
          sortOrder: 0,
          rowVersion: 1,
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        },
      ],
    });

    const skillGroup = makeEntry({
      id: "sg-1",
      entryType: "skill_group",
      title: "Backend & Databases",
      bullets: [
        {
          id: "b-2",
          userId: "user-1",
          entryId: "sg-1",
          text: "FastAPI, Node.js",
          visibility: "private",
          verificationStatus: "unverified",
          usagePolicy: "eligible",
          sortOrder: 0,
          rowVersion: 1,
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        },
      ],
    });

    const cataloged = collectCatalogedSkills([expEntry, skillGroup]);
    expect(cataloged.has("fastapi")).toBe(true);
    expect(cataloged.has("redis")).toBe(false);

    const suggestions = getBulletSuggestions({
      targetEntry: skillGroup,
      draftText: "",
      existingEntries: [expEntry, skillGroup],
    });

    expect(suggestions.evidencedSkillsToAdd).toContain("Redis");
    expect(suggestions.evidencedSkillsToAdd).toContain("PostgreSQL");
    expect(suggestions.evidencedSkillsToAdd).not.toContain("FastAPI");
  });

  it("filters skill_group suggestions when user types a prefix", () => {
    const proj = makeEntry({
      id: "proj-1",
      entryType: "project",
      title: "BotShield",
      descriptionContext: "Python, FastAPI, XGBoost, Chart.js",
    });
    const skillGroup = makeEntry({
      id: "sg-1",
      entryType: "skill_group",
      title: "Languages & Tools",
      bullets: [],
    });

    const suggestions = getBulletSuggestions({
      targetEntry: skillGroup,
      draftText: "xgb",
      existingEntries: [proj, skillGroup],
    });

    expect(suggestions.evidencedSkillsToAdd).toEqual(["XGBoost"]);
  });

  it("provides truth-bound weak-verb upgrade and metric reminder without fabricating numbers", () => {
    const exp = makeEntry({
      id: "exp-1",
      entryType: "experience",
      title: "Security Intern",
      descriptionContext: "Used OSINT and SIEM tools for triage.",
    });

    const suggestions = getBulletSuggestions({
      targetEntry: exp,
      draftText: "worked on vulnerability scanning with nmap",
      existingEntries: [exp],
    });

    expect(suggestions.draftSuggestions[0]?.text).toBe(
      "Contributed to vulnerability scanning with nmap"
    );
    expect(suggestions.metricHint).toBeTruthy();
    expect(suggestions.vaultContextTools).toContain("OSINT");
    expect(suggestions.vaultContextTools).toContain("SIEM");
  });

  it("suggests existing vault organizations, locations, tech hints, and detects similar entries in modal", () => {
    const existing = [
      makeEntry({
        id: "exp-1",
        entryType: "experience",
        title: "Cybersecurity Intern",
        organization: "CyArt Tech LLP",
        location: "Remote",
        descriptionContext: "Built automated threat checks using OSINT and Linux.",
      }),
      makeEntry({
        id: "sg-1",
        entryType: "skill_group",
        title: "Cloud Security",
        organization: null,
        location: null,
        bullets: [
          {
            id: "sb-1",
            userId: "user-1",
            entryId: "sg-1",
            text: "AWS, Google Cloud",
            visibility: "private",
            verificationStatus: "unverified",
            usagePolicy: "eligible",
            sortOrder: 0,
            rowVersion: 1,
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-01T00:00:00Z",
          },
        ],
      }),
    ];

    const formSuggestions = getEntryFormSuggestions({
      draftType: "experience",
      draftTitle: "Cybersecurity Intern",
      draftOrg: "",
      draftLocation: "",
      draftContext: "",
      editingEntryId: null,
      existingEntries: existing,
    });

    expect(formSuggestions.organizations).toContain("CyArt Tech LLP");
    expect(formSuggestions.locations).toContain("Remote");
    expect(formSuggestions.contextTechHints).toEqual(
      expect.arrayContaining(["OSINT", "Linux", "AWS", "Google Cloud"])
    );
    expect(formSuggestions.similarEntry?.id).toBe("exp-1");
    expect(collectEvidencedVaultTools(existing, { includeSkillGroups: true }).length).toBeGreaterThanOrEqual(4);
  });
});
