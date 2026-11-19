-- 1. Add row_version to resume_documents and resume_versions for atomic optimistic autosave concurrency
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'resume_documents' AND column_name = 'row_version'
  ) THEN
    ALTER TABLE resume_documents ADD COLUMN row_version integer NOT NULL DEFAULT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'resume_versions' AND column_name = 'row_version'
  ) THEN
    ALTER TABLE resume_versions ADD COLUMN row_version integer NOT NULL DEFAULT 1;
  END IF;
END $$;
--> statement-breakpoint

-- 2. Add composite index for bank_entries sorted pagination under default planner settings
CREATE INDEX IF NOT EXISTS bank_entries_user_sort_idx ON bank_entries (user_id, sort_order, id) WHERE deleted_at IS NULL;
