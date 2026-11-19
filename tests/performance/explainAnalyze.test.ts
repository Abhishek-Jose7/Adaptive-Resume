import { describe, it, expect, beforeAll } from "vitest";
import { client } from "@/lib/db/client";
import { runBenchmarkSeed, BENCHMARK_USER_ID } from "../../scripts/seedBenchmark";

interface ExplainPlanNode {
  "Node Type": string;
  "Index Name"?: string;
  "Index Cond"?: string;
  Plans?: ExplainPlanNode[];
}

interface ExplainResult {
  Plan: ExplainPlanNode;
  "Planning Time": number;
  "Execution Time": number;
}

function hasIndexScan(node: ExplainPlanNode): boolean {
  const nodeType = node["Node Type"] || "";
  if (
    nodeType.includes("Index Scan") ||
    nodeType.includes("Index Only Scan") ||
    nodeType.includes("Bitmap Index Scan")
  ) {
    return true;
  }
  if (node.Plans && node.Plans.length > 0) {
    return node.Plans.some((p) => hasIndexScan(p));
  }
  return false;
}

describe("PostgreSQL EXPLAIN ANALYZE Performance & Index Verification (PRD Section 8.4)", () => {
  beforeAll(async () => {
    // Seed 11,000+ benchmark rows
    await runBenchmarkSeed();
    // Update planner statistics
    await client`ANALYZE bank_entries;`;
    await client`ANALYZE achievement_bullets;`;
    await client`ANALYZE bullet_facts;`;
  }, 60000);

  it("should utilize composite index for tenant bullet retrieval with < 50ms execution", async () => {
    const targetEntryId = "be_bench_42";

    // EXPLAIN ANALYZE on tenant + entry bullet query
    const rows = await client`
      EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
      SELECT id, user_id, entry_id, text, sort_order
      FROM achievement_bullets
      WHERE user_id = ${BENCHMARK_USER_ID}
        AND entry_id = ${targetEntryId}
        AND deleted_at IS NULL
      ORDER BY sort_order, id;
    `;

    expect(rows).toBeDefined();
    const queryPlan = rows[0]["QUERY PLAN"] as ExplainResult[];
    const plan = queryPlan[0];
    const execTimeMs = plan["Execution Time"];

    console.log(`[EXPLAIN ANALYZE] Bullet Query Execution Time: ${execTimeMs.toFixed(3)}ms`);
    console.log(`[EXPLAIN ANALYZE] Root Node Type: ${plan.Plan["Node Type"]}`);

    // Execution time must be well under 50ms (PRD SLA)
    expect(execTimeMs).toBeLessThan(50);
    // Must hit index
    expect(hasIndexScan(plan.Plan)).toBe(true);
  });

  it("should utilize composite index for bank entries ordering with < 50ms execution", async () => {
    const rows = await client`
      EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
      SELECT id, user_id, entry_type, title, updated_at
      FROM bank_entries
      WHERE user_id = ${BENCHMARK_USER_ID}
        AND deleted_at IS NULL
      ORDER BY updated_at DESC, id DESC
      LIMIT 20;
    `;

    expect(rows).toBeDefined();
    const queryPlan = rows[0]["QUERY PLAN"] as ExplainResult[];
    const plan = queryPlan[0];
    const execTimeMs = plan["Execution Time"];

    console.log(`[EXPLAIN ANALYZE] Bank Entries Query Execution Time: ${execTimeMs.toFixed(3)}ms`);
    console.log(`[EXPLAIN ANALYZE] Bank Entries Node Type:`, JSON.stringify(plan.Plan, null, 2));

    expect(execTimeMs).toBeLessThan(50);
    expect(hasIndexScan(plan.Plan)).toBe(true);
  });

  it("should utilize GIN full-text index for lexical search with < 50ms execution", async () => {
    const searchQuery = "PostgreSQL & latency";

    const rows = await client`
      EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
      SELECT id, user_id, text
      FROM achievement_bullets
      WHERE user_id = ${BENCHMARK_USER_ID}
        AND search_vector @@ to_tsquery('english', ${searchQuery})
        AND deleted_at IS NULL;
    `;

    expect(rows).toBeDefined();
    const queryPlan = rows[0]["QUERY PLAN"] as ExplainResult[];
    const plan = queryPlan[0];
    const execTimeMs = plan["Execution Time"];

    console.log(`[EXPLAIN ANALYZE] GIN Search Vector Query Execution Time: ${execTimeMs.toFixed(3)}ms`);
    console.log(`[EXPLAIN ANALYZE] GIN Search Node Type:`, JSON.stringify(plan.Plan, null, 2));

    expect(execTimeMs).toBeLessThan(50);
    expect(hasIndexScan(plan.Plan)).toBe(true);
  });

  it("should utilize composite index on bullet facts with < 50ms execution", async () => {
    const targetBulletId = "ab_bench_100";

    const rows = await client`
      EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
      SELECT id, fact_type, fact_key, value_text
      FROM bullet_facts
      WHERE user_id = ${BENCHMARK_USER_ID}
        AND bullet_id = ${targetBulletId};
    `;

    expect(rows).toBeDefined();
    const queryPlan = rows[0]["QUERY PLAN"] as ExplainResult[];
    const plan = queryPlan[0];
    const execTimeMs = plan["Execution Time"];

    console.log(`[EXPLAIN ANALYZE] Bullet Facts Query Execution Time: ${execTimeMs.toFixed(3)}ms`);

    expect(execTimeMs).toBeLessThan(50);
    expect(hasIndexScan(plan.Plan)).toBe(true);
  });
});
