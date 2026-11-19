-- Migration 0004: Fix composite foreign keys with column targeting for ON DELETE SET NULL in PostgreSQL 15+
-- Prevents Postgres from attempting to set NOT NULL user_id to NULL when parent job/version/application is deleted

DO $$
BEGIN
  -- 1. resume_documents -> jobs
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'resume_documents_user_job_fk') THEN
    ALTER TABLE resume_documents DROP CONSTRAINT resume_documents_user_job_fk;
  END IF;
  ALTER TABLE resume_documents ADD CONSTRAINT resume_documents_user_job_fk
    FOREIGN KEY (user_id, job_id) REFERENCES jobs(user_id, id) ON DELETE SET NULL (job_id);

  -- 2. applications -> jobs
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'applications_user_job_fk') THEN
    ALTER TABLE applications DROP CONSTRAINT applications_user_job_fk;
  END IF;
  ALTER TABLE applications ADD CONSTRAINT applications_user_job_fk
    FOREIGN KEY (user_id, job_id) REFERENCES jobs(user_id, id) ON DELETE SET NULL (job_id);

  -- 3. applications -> resume_versions
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'applications_user_version_fk') THEN
    ALTER TABLE applications DROP CONSTRAINT applications_user_version_fk;
  END IF;
  ALTER TABLE applications ADD CONSTRAINT applications_user_version_fk
    FOREIGN KEY (user_id, resume_version_id) REFERENCES resume_versions(user_id, id) ON DELETE SET NULL (resume_version_id);

  -- 4. cover_letters -> jobs
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cover_letters_user_job_fk') THEN
    ALTER TABLE cover_letters DROP CONSTRAINT cover_letters_user_job_fk;
  END IF;
  ALTER TABLE cover_letters ADD CONSTRAINT cover_letters_user_job_fk
    FOREIGN KEY (user_id, job_id) REFERENCES jobs(user_id, id) ON DELETE SET NULL (job_id);

  -- 5. cover_letters -> applications
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cover_letters_user_app_fk') THEN
    ALTER TABLE cover_letters DROP CONSTRAINT cover_letters_user_app_fk;
  END IF;
  ALTER TABLE cover_letters ADD CONSTRAINT cover_letters_user_app_fk
    FOREIGN KEY (user_id, application_id) REFERENCES applications(user_id, id) ON DELETE SET NULL (application_id);
END $$;
