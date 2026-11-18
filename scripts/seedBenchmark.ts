import { db } from "../src/lib/db/client";
import {
  users,
  bankEntries,
  achievementBullets,
  bulletFacts,
} from "../src/lib/db/schema";
import { sql } from "drizzle-orm";

export const BENCHMARK_USER_ID = "user_benchmark_perf_10k";

export async function runBenchmarkSeed() {
  console.log("Starting 10,000+ record database seed benchmark...");
  const startTime = Date.now();

  // 1. Ensure benchmark user exists
  await db
    .insert(users)
    .values({
      id: BENCHMARK_USER_ID,
      clerkSubject: `clerk_${BENCHMARK_USER_ID}`,
      username: `bench_${Date.now()}`,
      email: "bench10k@example.com",
      displayName: "Benchmark 10K Performance User",
    })
    .onConflictDoNothing();

  const BATCH_SIZE = 500;
  const TOTAL_ENTRIES = 1000;
  const BULLETS_PER_ENTRY = 5;
  const TOTAL_BULLETS = TOTAL_ENTRIES * BULLETS_PER_ENTRY; // 5,000 bullets
  const TOTAL_FACTS = TOTAL_BULLETS; // 5,000 facts
  // Total inserted: 1 + 1,000 + 5,000 + 5,000 = 11,001 rows

  // 2. Insert 1,000 Bank Entries
  console.log(`Seeding ${TOTAL_ENTRIES} bank entries...`);
  const entryRows = [];
  for (let i = 0; i < TOTAL_ENTRIES; i++) {
    entryRows.push({
      id: `be_bench_${i}`,
      userId: BENCHMARK_USER_ID,
      entryType: i % 4 === 0 ? "experience" : i % 4 === 1 ? "project" : i % 4 === 2 ? "education" : "skill_group",
      title: `Engineering Role or Project ${i}`,
      organization: `TechCorp Cluster ${(i % 50) + 1}`,
      startDate: "2020-01-01",
      endDate: "2023-01-01",
      sortOrder: i,
      visibility: i % 5 === 0 ? "public" : "private",
    });
  }

  for (let i = 0; i < entryRows.length; i += BATCH_SIZE) {
    const chunk = entryRows.slice(i, i + BATCH_SIZE);
    await db.insert(bankEntries).values(chunk).onConflictDoNothing();
  }

  // 3. Insert 5,000 Achievement Bullets with search vectors
  console.log(`Seeding ${TOTAL_BULLETS} achievement bullets with full-text search vectors...`);
  const bulletRows = [];
  const technologies = ["PostgreSQL", "Rust", "TypeScript", "Docker", "Kubernetes", "Next.js", "Redis", "Kafka", "AWS", "Go"];

  for (let i = 0; i < TOTAL_BULLETS; i++) {
    const entryIndex = Math.floor(i / BULLETS_PER_ENTRY);
    const tech = technologies[i % technologies.length];
    const metric = 20 + (i % 80);
    const text = `Engineered high-throughput ${tech} microservice reducing p99 latency by ${metric}% across 10M requests.`;

    bulletRows.push({
      id: `ab_bench_${i}`,
      userId: BENCHMARK_USER_ID,
      entryId: `be_bench_${entryIndex}`,
      text,
      verified: true,
      sortOrder: i % BULLETS_PER_ENTRY,
      visibility: i % 3 === 0 ? "public" : "private",
      searchVector: sql`to_tsvector('english', ${text})`,
    });
  }

  for (let i = 0; i < bulletRows.length; i += BATCH_SIZE) {
    const chunk = bulletRows.slice(i, i + BATCH_SIZE);
    await db.insert(achievementBullets).values(chunk).onConflictDoNothing();
  }

  // 4. Insert 5,000 Bullet Facts (metrics & tools)
  console.log(`Seeding ${TOTAL_FACTS} structured bullet facts...`);
  const factRows = [];
  for (let i = 0; i < TOTAL_FACTS; i++) {
    const bulletId = `ab_bench_${i}`;
    const entryIndex = Math.floor(i / BULLETS_PER_ENTRY);
    const metricVal = 20 + (i % 80);

    factRows.push({
      id: `bf_bench_${i}`,
      userId: BENCHMARK_USER_ID,
      bulletId,
      entryId: null,
      factType: i % 2 === 0 ? "metric" : "tool",
      factKey: i % 2 === 0 ? "latency_reduction" : "primary_language",
      valueText: i % 2 === 0 ? `${metricVal}%` : technologies[i % technologies.length],
      valueNumber: i % 2 === 0 ? metricVal : null,
      unit: i % 2 === 0 ? "percent" : null,
      metricKind: i % 2 === 0 ? "percent" : null,
      verificationStatus: "verified",
    });
  }

  for (let i = 0; i < factRows.length; i += BATCH_SIZE) {
    const chunk = factRows.slice(i, i + BATCH_SIZE);
    await db.insert(bulletFacts).values(chunk).onConflictDoNothing();
  }

  const durationMs = Date.now() - startTime;
  console.log(
    `Benchmark seed complete: 11,001 rows inserted in ${durationMs}ms across bankEntries, achievementBullets, and bulletFacts.`
  );
}

// Allow direct CLI execution
if (process.argv[1]?.includes("seedBenchmark")) {
  runBenchmarkSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Seed failed:", err);
      process.exit(1);
    });
}
