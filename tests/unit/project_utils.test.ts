import { describe, it, expect } from "vitest";
import { shortenProjectDescription } from "@/lib/utils/projectUtils";

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
});
