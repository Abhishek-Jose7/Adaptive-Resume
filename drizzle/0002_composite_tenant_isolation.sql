-- 1. Create composite unique constraints on parent tables (user_id, id)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bank_entries_user_id_id_unique') THEN
    ALTER TABLE bank_entries ADD CONSTRAINT bank_entries_user_id_id_unique UNIQUE (user_id, id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'achievement_bullets_user_id_id_unique') THEN
    ALTER TABLE achievement_bullets ADD CONSTRAINT achievement_bullets_user_id_id_unique UNIQUE (user_id, id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'jobs_user_id_id_unique') THEN
    ALTER TABLE jobs ADD CONSTRAINT jobs_user_id_id_unique UNIQUE (user_id, id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'resume_documents_user_id_id_unique') THEN
    ALTER TABLE resume_documents ADD CONSTRAINT resume_documents_user_id_id_unique UNIQUE (user_id, id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'resume_versions_user_id_id_unique') THEN
    ALTER TABLE resume_versions ADD CONSTRAINT resume_versions_user_id_id_unique UNIQUE (user_id, id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'applications_user_id_id_unique') THEN
    ALTER TABLE applications ADD CONSTRAINT applications_user_id_id_unique UNIQUE (user_id, id);
  END IF;
END $$;
--> statement-breakpoint

-- 2. Add composite foreign key constraints enforcing matching tenant (user_id) at PostgreSQL engine level
DO $$
BEGIN
  -- achievement_bullets -> bank_entries
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'achievement_bullets_user_entry_fk') THEN
    ALTER TABLE achievement_bullets ADD CONSTRAINT achievement_bullets_user_entry_fk
    FOREIGN KEY (user_id, entry_id) REFERENCES bank_entries(user_id, id) ON DELETE CASCADE;
  END IF;

  -- bullet_facts -> achievement_bullets
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bullet_facts_user_bullet_fk') THEN
    ALTER TABLE bullet_facts ADD CONSTRAINT bullet_facts_user_bullet_fk
    FOREIGN KEY (user_id, bullet_id) REFERENCES achievement_bullets(user_id, id) ON DELETE CASCADE;
  END IF;

  -- bullet_facts -> bank_entries
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bullet_facts_user_entry_fk') THEN
    ALTER TABLE bullet_facts ADD CONSTRAINT bullet_facts_user_entry_fk
    FOREIGN KEY (user_id, entry_id) REFERENCES bank_entries(user_id, id) ON DELETE CASCADE;
  END IF;

  -- jd_analyses -> jobs
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'jd_analyses_user_job_fk') THEN
    ALTER TABLE jd_analyses ADD CONSTRAINT jd_analyses_user_job_fk
    FOREIGN KEY (user_id, job_id) REFERENCES jobs(user_id, id) ON DELETE CASCADE;
  END IF;

  -- resume_documents -> jobs
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'resume_documents_user_job_fk') THEN
    ALTER TABLE resume_documents ADD CONSTRAINT resume_documents_user_job_fk
    FOREIGN KEY (user_id, job_id) REFERENCES jobs(user_id, id) ON DELETE SET NULL;
  END IF;

  -- resume_versions -> resume_documents
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'resume_versions_user_doc_fk') THEN
    ALTER TABLE resume_versions ADD CONSTRAINT resume_versions_user_doc_fk
    FOREIGN KEY (user_id, resume_document_id) REFERENCES resume_documents(user_id, id) ON DELETE CASCADE;
  END IF;

  -- applications -> jobs
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'applications_user_job_fk') THEN
    ALTER TABLE applications ADD CONSTRAINT applications_user_job_fk
    FOREIGN KEY (user_id, job_id) REFERENCES jobs(user_id, id) ON DELETE SET NULL;
  END IF;

  -- applications -> resume_versions
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'applications_user_version_fk') THEN
    ALTER TABLE applications ADD CONSTRAINT applications_user_version_fk
    FOREIGN KEY (user_id, resume_version_id) REFERENCES resume_versions(user_id, id) ON DELETE SET NULL;
  END IF;

  -- application_interviews -> applications
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'app_interviews_user_app_fk') THEN
    ALTER TABLE application_interviews ADD CONSTRAINT app_interviews_user_app_fk
    FOREIGN KEY (user_id, application_id) REFERENCES applications(user_id, id) ON DELETE CASCADE;
  END IF;

  -- cover_letters -> jobs
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cover_letters_user_job_fk') THEN
    ALTER TABLE cover_letters ADD CONSTRAINT cover_letters_user_job_fk
    FOREIGN KEY (user_id, job_id) REFERENCES jobs(user_id, id) ON DELETE SET NULL;
  END IF;

  -- cover_letters -> applications
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cover_letters_user_app_fk') THEN
    ALTER TABLE cover_letters ADD CONSTRAINT cover_letters_user_app_fk
    FOREIGN KEY (user_id, application_id) REFERENCES applications(user_id, id) ON DELETE SET NULL;
  END IF;

  -- project_metadata -> bank_entries
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'project_metadata_user_entry_fk') THEN
    ALTER TABLE project_metadata ADD CONSTRAINT project_metadata_user_entry_fk
    FOREIGN KEY (user_id, entry_id) REFERENCES bank_entries(user_id, id) ON DELETE CASCADE;
  END IF;

  -- quantification_interviews -> achievement_bullets
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quant_interviews_user_bullet_fk') THEN
    ALTER TABLE quantification_interviews ADD CONSTRAINT quant_interviews_user_bullet_fk
    FOREIGN KEY (user_id, bullet_id) REFERENCES achievement_bullets(user_id, id) ON DELETE CASCADE;
  END IF;
END $$;
