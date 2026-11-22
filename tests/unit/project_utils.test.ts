import { describe, it, expect } from "vitest";
import { shortenProjectDescription, getGroupedSkills } from "@/lib/utils/projectUtils";

describe("Project Description Formatting & Shortening Utility", () => {
  it("returns undefined for null, undefined, or empty descriptions", () => {
    expect(shortenProjectDescription(null)).toBeUndefined();
    expect(shortenProjectDescription(undefined)).toBeUndefined();
    expect(shortenProjectDescription("   ")).toBeUndefined();
  });

  it("leaves single-sentence concise descriptions intact", () => {
    const desc = "A full-stack e-commerce store built with Next.js and Stripe.";
    const result = shortenProjectDescription(desc);
    expect(result).toBe("A full-stack e-commerce store built with Next.js and Stripe.");
  });

  it("extracts the first punchy sentence when multiple sentences are provided", () => {
    const multiSentence =
      "A decentralized micro-lending platform. It allows users to borrow against collateral without intermediaries. Built with Solidity and React.";
    const result = shortenProjectDescription(multiSentence);
    expect(result).toBe("A decentralized micro-lending platform.");
  });

  it("strips markdown headings, raw URLs, and code blocks before formatting", () => {
    const rawMarkdown = "### Project Overview\n```ts\nconsole.log('test')\n```\nReal-time collaborative whiteboard app. Visit https://myapp.dev for live demo.";
    const result = shortenProjectDescription(rawMarkdown);
    expect(result).toBe("Real-time collaborative whiteboard app.");
    expect(result).not.toContain("https://");
    expect(result).not.toContain("###");
  });

  it("cleanly truncates at word boundaries with ellipsis when single sentence exceeds maxLength", () => {
    const longSingleSentence =
      "Architected high-throughput financial distributed ledger system capable of processing 50,000 transactions per second with zero downtime and consensus-driven Byzantine fault tolerance across global clusters";
    const result = shortenProjectDescription(longSingleSentence, 100);
    expect(result).toBeDefined();
    expect(result!.length).toBeLessThanOrEqual(103);
    expect(result!.endsWith("...")).toBe(true);
    // Must not cut words awkwardly
    expect(result).not.toContain("capab...");
  });

  describe("Skill Categorization & Bold Heading Grouping Utility", () => {
    it("returns empty array for empty or missing skills", () => {
      expect(getGroupedSkills(undefined)).toEqual([]);
      expect(getGroupedSkills([])).toEqual([]);
    });

    it("groups skills by category preserving distinct groups and items", () => {
      const skills = [
        { name: "TypeScript", category: "Languages" },
        { name: "Python", category: "Languages" },
        { name: "PostgreSQL", category: "Databases & Tools" },
        { name: "Docker", category: "Databases & Tools" },
      ];
      const grouped = getGroupedSkills(skills);
      expect(grouped).toHaveLength(2);
      expect(grouped[0].category).toBe("Languages");
      expect(grouped[0].items).toEqual(["TypeScript", "Python"]);
      expect(grouped[1].category).toBe("Databases & Tools");
      expect(grouped[1].items).toEqual(["PostgreSQL", "Docker"]);
    });

    it("returns single group with empty category if no categories are present", () => {
      const skills = [{ name: "Git" }, { name: "Linux" }];
      const grouped = getGroupedSkills(skills);
      expect(grouped).toHaveLength(1);
      expect(grouped[0].category).toBe("");
      expect(grouped[0].items).toEqual(["Git", "Linux"]);
    });
  });
});

