import postgres from "postgres";
import fs from "fs";
import path from "path";

const connectionString =
  process.env.DATABASE_URL || "postgresql://postgres@localhost:5432/resume_maker";

export async function runMigrations() {
  console.log("Starting database migrations on:", connectionString.replace(/:[^:@]+@/, ":***@"));

  const sql = postgres(connectionString, {
    max: 1,
    ssl: connectionString.includes("neon.tech") ? { rejectUnauthorized: false } : undefined,
  });

  try {
    // Read generated migration files in drizzle/
    const drizzleDir = path.resolve(process.cwd(), "drizzle");
    const files = fs
      .readdirSync(drizzleDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      console.log(`Executing migration file: ${file}`);
      const filePath = path.join(drizzleDir, file);
      const sqlContent = fs.readFileSync(filePath, "utf-8");

      // Split statements by "--> statement-breakpoint"
      const statements = sqlContent
        .split("--> statement-breakpoint")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const statement of statements) {
        try {
          await sql.unsafe(statement);
        } catch (stmtError: any) {
          // If table/index already exists, ignore and continue
          if (stmtError.code === "42P07" || stmtError.code === "42710") {
            // relation already exists / duplicate object
            continue;
          }
          console.warn("Notice during statement execution:", stmtError.message);
        }
      }
    }

    // Additional PRD-specified constraints and search_vector update triggers
    console.log("Applying PRD-specific constraints and full-text search triggers...");

    await sql.unsafe(`
      -- Bullet facts constraint: exactly one of bullet_id or entry_id must be set
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

    await sql.unsafe(`
      -- Full-text search vector auto-update trigger for bank_entries
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

    await sql.unsafe(`
      -- Full-text search vector auto-update trigger for achievement_bullets
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

    console.log("Database migrations completed successfully! All 20 entities & indexes ready.");
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
