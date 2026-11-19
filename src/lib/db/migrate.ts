import postgres from "postgres";
import fs from "fs";
import path from "path";
import { createHash } from "crypto";

const connectionString =
  process.env.DATABASE_URL || "postgresql://postgres@localhost:5432/resume_maker";

export async function runMigrations() {
  console.log("Starting database migrations on:", connectionString.replace(/:[^:@]+@/, ":***@"));

  const sql = postgres(connectionString, {
    max: 1,
    ssl: connectionString.includes("neon.tech") ? { rejectUnauthorized: false } : undefined,
  });

  try {
    // 1. Initialize migration journal table if it doesn't exist
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS _migrations_journal (
        id SERIAL PRIMARY KEY,
        file_name VARCHAR(255) NOT NULL UNIQUE,
        checksum VARCHAR(64) NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `);

    // 2. Fetch already executed migrations and live schema artifacts
    const executedRows = await sql<{ file_name: string; checksum: string }[]>`
      SELECT file_name, checksum FROM _migrations_journal;
    `;
    const journalMap = new Map(executedRows.map((r) => [r.file_name, r.checksum]));

    const existingTableRows = await sql<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
    `;
    const liveTables = new Set(existingTableRows.map((r) => r.table_name));

    const existingConstraintRows = await sql<{ constraint_name: string }[]>`
      SELECT constraint_name FROM information_schema.table_constraints WHERE table_schema = 'public';
    `;
    const liveConstraints = new Set(existingConstraintRows.map((r) => r.constraint_name));

    const existingColumnRows = await sql<{ table_name: string; column_name: string }[]>`
      SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public';
    `;
    const liveColumns = new Set(existingColumnRows.map((r) => `${r.table_name}.${r.column_name}`));

    const existingIndexRows = await sql<{ indexname: string }[]>`
      SELECT indexname FROM pg_indexes WHERE schemaname = 'public';
    `;
    const liveIndexes = new Set(existingIndexRows.map((r) => r.indexname));

    // Specification of required schema artifacts per migration file
    const migrationSpecs: Record<
      string,
      { tables?: string[]; constraints?: string[]; columns?: string[]; indexes?: string[] }
    > = {
      "0000_even_shadowcat.sql": {
        tables: [
          "users",
          "bank_entries",
          "achievement_bullets",
          "bullet_facts",
          "sources",
          "source_evidence",
          "import_batches",
          "staged_items",
          "jobs",
          "jd_analyses",
          "resume_documents",
          "resume_versions",
          "applications",
          "cover_letters",
          "ai_runs",
          "provider_credentials",
          "share_links",
          "audit_events",
          "background_jobs",
          "bullet_relations",
        ],
        indexes: [
          "bank_entries_user_sort_idx",
          "bank_entries_user_updated_idx",
          "achievement_bullets_user_entry_sort_idx",
          "bullet_facts_user_bullet_idx",
          "bullet_facts_user_entry_idx",
        ],
      },
      "0001_sleepy_mimic.sql": {
        tables: [
          "career_graph_edges",
          "project_metadata",
          "application_interviews",
          "quantification_interviews",
          "user_usage_quotas",
        ],
        indexes: [
          "career_graph_user_source_idx",
          "project_metadata_user_entry_idx",
          "user_usage_quotas_user_period_idx",
        ],
      },
      "0002_composite_tenant_isolation.sql": {
        constraints: [
          "bank_entries_user_id_id_unique",
          "achievement_bullets_user_id_id_unique",
          "jobs_user_id_id_unique",
          "resume_documents_user_id_id_unique",
          "resume_versions_user_id_id_unique",
          "applications_user_id_id_unique",
          "achievement_bullets_user_entry_fk",
          "bullet_facts_user_bullet_fk",
          "bullet_facts_user_entry_fk",
          "jd_analyses_user_job_fk",
          "resume_documents_user_job_fk",
          "resume_versions_user_doc_fk",
          "applications_user_job_fk",
          "applications_user_version_fk",
          "app_interviews_user_app_fk",
          "cover_letters_user_job_fk",
          "cover_letters_user_app_fk",
          "project_metadata_user_entry_fk",
          "quant_interviews_user_bullet_fk",
        ],
      },
      "0003_p1_database_correctness.sql": {
        columns: [
          "resume_documents.row_version",
          "resume_versions.row_version",
        ],
      },
      "0004_fix_composite_fks.sql": {
        constraints: [
          "resume_documents_user_job_fk",
          "applications_user_job_fk",
          "applications_user_version_fk",
          "cover_letters_user_job_fk",
          "cover_letters_user_app_fk",
        ],
      },
      "0005_ocr_consent_and_limits.sql": {
        tables: [
          "user_ocr_consents",
          "ocr_rate_limits",
        ],
        indexes: [
          "user_ocr_consents_user_idx",
          "ocr_rate_limits_user_window_idx",
        ],
      },
      "0006_resume_profile_fields.sql": {
        columns: [
          "users.contact_email",
          "users.phone",
          "users.location",
          "users.headline",
          "users.github_url",
          "users.linkedin_url",
          "users.portfolio_url",
        ],
      },
    };

    // 3. Read generated migration files in drizzle/
    const drizzleDir = path.resolve(process.cwd(), "drizzle");
    const files = fs
      .readdirSync(drizzleDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const filePath = path.join(drizzleDir, file);
      const sqlContent = fs.readFileSync(filePath, "utf-8");
      const checksum = createHash("sha256").update(sqlContent).digest("hex");
      const spec = migrationSpecs[file];

      // Check if migration is already journaled
      if (journalMap.has(file)) {
        console.log(`Migration already journaled: ${file}`);
        // Verify that expected schema artifacts are still intact
        if (spec) {
          const missingTables = (spec.tables || []).filter((t) => !liveTables.has(t));
          const missingConstraints = (spec.constraints || []).filter((c) => !liveConstraints.has(c));
          const missingColumns = (spec.columns || []).filter((c) => !liveColumns.has(c));
          const missingIndexes = (spec.indexes || []).filter((i) => !liveIndexes.has(i));
          if (missingTables.length > 0 || missingConstraints.length > 0 || missingColumns.length > 0 || missingIndexes.length > 0) {
            throw new Error(
              `Migration integrity error: ${file} was journaled but schema is missing artifacts: ` +
                `tables [${missingTables.join(", ")}], constraints [${missingConstraints.join(", ")}], columns [${missingColumns.join(", ")}], indexes [${missingIndexes.join(", ")}]`
            );
          }
        }
        continue;
      }

      console.log(`Evaluating migration file: ${file}`);

      // Deep Schema Inspection: Check if ALL expected artifacts already exist (e.g. pre-journal database)
      if (spec) {
        const allTablesExist = (spec.tables || []).every((t) => liveTables.has(t));
        const allConstraintsExist = (spec.constraints || []).every((c) => liveConstraints.has(c));
        const allColumnsExist = (spec.columns || []).every((c) => liveColumns.has(c));
        const allIndexesExist = (spec.indexes || []).every((i) => liveIndexes.has(i));

        if (allTablesExist && allConstraintsExist && allColumnsExist && allIndexesExist && (spec.tables || spec.constraints || spec.columns || spec.indexes)) {
          console.log(`Complete schema state for ${file} verified in live database; recording in journal.`);
          await sql`
            INSERT INTO _migrations_journal (file_name, checksum)
            VALUES (${file}, ${checksum})
            ON CONFLICT (file_name) DO NOTHING;
          `;
          journalMap.set(file, checksum);
          continue;
        }
      }

      console.log(`Executing migration file inside atomic transaction: ${file}`);

      const statements = sqlContent
        .split("--> statement-breakpoint")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      // Execute entire migration file inside a single transaction. Fail hard on error!
      await sql.begin(async (tx) => {
        for (const statement of statements) {
          try {
            await tx.unsafe(statement);
          } catch (stmtError: any) {
            // For CREATE TABLE statements in partially migrated legacy DBs, check if table already exists
            if (stmtError.code === "42P07" && statement.toUpperCase().includes("CREATE TABLE")) {
              console.log(`Notice: Table in statement already exists, continuing.`);
              continue;
            }
            console.error(`Fatal migration statement error in ${file}:`, stmtError.message);
            throw new Error(`Migration statement failed in ${file}: ${stmtError.message}`);
          }
        }

        // Record in journal within the same transaction
        await tx`
          INSERT INTO _migrations_journal (file_name, checksum)
          VALUES (${file}, ${checksum});
        `;
      });

      // Post-Migration Verification: Re-query schema to guarantee 100% of expected artifacts exist
      const refreshedTableRows = await sql<{ table_name: string }[]>`
        SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
      `;
      for (const r of refreshedTableRows) liveTables.add(r.table_name);

      const refreshedConstraintRows = await sql<{ constraint_name: string }[]>`
        SELECT constraint_name FROM information_schema.table_constraints WHERE table_schema = 'public';
      `;
      for (const r of refreshedConstraintRows) liveConstraints.add(r.constraint_name);

      const refreshedColumnRows = await sql<{ table_name: string; column_name: string }[]>`
        SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public';
      `;
      for (const r of refreshedColumnRows) liveColumns.add(`${r.table_name}.${r.column_name}`);

      const refreshedIndexRows = await sql<{ indexname: string }[]>`
        SELECT indexname FROM pg_indexes WHERE schemaname = 'public';
      `;
      for (const r of refreshedIndexRows) liveIndexes.add(r.indexname);

      if (spec) {
        const missingPostTables = (spec.tables || []).filter((t) => !liveTables.has(t));
        const missingPostConstraints = (spec.constraints || []).filter((c) => !liveConstraints.has(c));
        const missingPostColumns = (spec.columns || []).filter((c) => !liveColumns.has(c));
        const missingPostIndexes = (spec.indexes || []).filter((i) => !liveIndexes.has(i));
        if (missingPostTables.length > 0 || missingPostConstraints.length > 0 || missingPostColumns.length > 0 || missingPostIndexes.length > 0) {
          throw new Error(
            `Post-migration verification failed for ${file}! Missing: ` +
              `tables [${missingPostTables.join(", ")}], constraints [${missingPostConstraints.join(", ")}], columns [${missingPostColumns.join(", ")}], indexes [${missingPostIndexes.join(", ")}]`
          );
        }
      }

      journalMap.set(file, checksum);
      console.log(`Migration committed & verified: ${file}`);
    }

    // 4. Apply PRD-specific constraints and triggers inside a transaction
    console.log("Applying PRD-specific constraints and full-text search triggers...");

    await sql.begin(async (tx) => {
      // Bullet facts constraint: exactly one of bullet_id or entry_id must be set
      await tx.unsafe(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'bullet_facts_parent_check'
          ) THEN
            ALTER TABLE bullet_facts ADD CONSTRAINT bullet_facts_parent_check
            CHECK ((bullet_id IS NOT NULL AND entry_id IS NULL) OR (bullet_id IS NULL AND entry_id IS NOT NULL));
          END IF;
        END $$;
      `);

      // Full-text search vector auto-update trigger for bank_entries
      await tx.unsafe(`
        CREATE OR REPLACE FUNCTION update_bank_entries_search_vector() RETURNS trigger AS $$
        BEGIN
          new.search_vector := to_tsvector('english',
            coalesce(new.title, '') || ' ' ||
            coalesce(new.organization, '') || ' ' ||
            coalesce(new.description_context, '')
          );
          RETURN new;
        END
        $$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS trg_bank_entries_search_vector ON bank_entries;
        CREATE TRIGGER trg_bank_entries_search_vector
        BEFORE INSERT OR UPDATE ON bank_entries
        FOR EACH ROW EXECUTE FUNCTION update_bank_entries_search_vector();
      `);

      // Full-text search vector auto-update trigger for achievement_bullets
      await tx.unsafe(`
        CREATE OR REPLACE FUNCTION update_achievement_bullets_search_vector() RETURNS trigger AS $$
        BEGIN
          new.search_vector := to_tsvector('english',
            coalesce(new.text, '') || ' ' ||
            coalesce(new.normalized_text, '')
          );
          RETURN new;
        END
        $$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS trg_achievement_bullets_search_vector ON achievement_bullets;
        CREATE TRIGGER trg_achievement_bullets_search_vector
        BEFORE INSERT OR UPDATE ON achievement_bullets
        FOR EACH ROW EXECUTE FUNCTION update_achievement_bullets_search_vector();
      `);
    });

    console.log("Database migrations completed successfully! All 25 entities & indexes verified.");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

// Run directly if invoked as script
if (require.main === module || process.argv[1]?.includes("migrate.ts")) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
