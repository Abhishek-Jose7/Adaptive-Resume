CREATE TABLE "achievement_bullets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"entry_id" text NOT NULL,
	"text" text NOT NULL,
	"normalized_text" text,
	"visibility" text DEFAULT 'private' NOT NULL,
	"verification_status" text DEFAULT 'unverified' NOT NULL,
	"usage_policy" text DEFAULT 'eligible' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"row_version" integer DEFAULT 1 NOT NULL,
	"source_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"search_vector" "tsvector"
);
--> statement-breakpoint
CREATE TABLE "ai_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"task_type" text NOT NULL,
	"job_id" text,
	"resume_version_id" text,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"prompt_version" text NOT NULL,
	"tokens_in" integer DEFAULT 0,
	"tokens_out" integer DEFAULT 0,
	"validator_report_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"job_id" text,
	"resume_version_id" text,
	"status" text DEFAULT 'Saved' NOT NULL,
	"applied_at" timestamp with time zone,
	"follow_up_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text,
	"metadata_json" jsonb,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "background_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"task_type" text NOT NULL,
	"input_ref" text,
	"progress_stage" text DEFAULT 'queued' NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"idempotency_key" text,
	"lease_expires_at" timestamp with time zone,
	"last_error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "bank_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"entry_type" text NOT NULL,
	"title" text NOT NULL,
	"organization" text,
	"location" text,
	"start_date" date,
	"end_date" date,
	"is_current" boolean DEFAULT false NOT NULL,
	"description_context" text,
	"visibility" text DEFAULT 'private' NOT NULL,
	"verification_status" text DEFAULT 'unverified' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"row_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"search_vector" "tsvector"
);
--> statement-breakpoint
CREATE TABLE "bullet_facts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"bullet_id" text,
	"entry_id" text,
	"fact_type" text NOT NULL,
	"fact_key" text NOT NULL,
	"value_text" text NOT NULL,
	"value_number" double precision,
	"unit" text,
	"currency_code" text,
	"metric_kind" text,
	"source_evidence_id" text,
	"verification_status" text DEFAULT 'unverified' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bullet_relations" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"source_bullet_id" text NOT NULL,
	"target_bullet_id" text NOT NULL,
	"relation_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cover_letters" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"job_id" text,
	"application_id" text,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"tone" text DEFAULT 'professional' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_batches" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"source_id" text,
	"batch_status" text DEFAULT 'staged' NOT NULL,
	"total_items" integer DEFAULT 0 NOT NULL,
	"staged_items_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jd_analyses" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"job_id" text NOT NULL,
	"analysis_json" jsonb NOT NULL,
	"confidence" double precision DEFAULT 0.8,
	"prompt_version" text DEFAULT 'v1' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text,
	"company" text,
	"location" text,
	"source_url" text,
	"raw_text" text NOT NULL,
	"content_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_credentials" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" text NOT NULL,
	"encrypted_api_key" text NOT NULL,
	"key_nonce" text NOT NULL,
	"key_version" integer DEFAULT 1 NOT NULL,
	"last_4" text NOT NULL,
	"is_valid" boolean DEFAULT true NOT NULL,
	"last_tested_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resume_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"base_resume_id" text,
	"job_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resume_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"resume_document_id" text NOT NULL,
	"parent_version_id" text,
	"version_number" integer NOT NULL,
	"version_kind" text NOT NULL,
	"resume_doc_json" jsonb NOT NULL,
	"content_hash" text NOT NULL,
	"template_id" text DEFAULT 'classic-ats' NOT NULL,
	"template_version" text DEFAULT '1.0' NOT NULL,
	"theme_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"page_size" text DEFAULT 'A4' NOT NULL,
	"target_pages" integer DEFAULT 1 NOT NULL,
	"created_by" text DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finalized_at" timestamp with time zone,
	"immutable_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "share_links" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"resume_version_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"scope_json" jsonb NOT NULL,
	"redactions_json" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "share_links_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "source_evidence" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"source_id" text NOT NULL,
	"source_locator" text,
	"snippet" text,
	"content_hash" text,
	"confidence" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"source_type" text NOT NULL,
	"source_label" text,
	"source_url" text,
	"source_hash" text,
	"parser_version" text,
	"retention_policy" text DEFAULT 'discard_raw',
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staged_items" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"batch_id" text NOT NULL,
	"entry_type" text NOT NULL,
	"raw_snippet" text,
	"parsed_data_json" jsonb NOT NULL,
	"confidence" double precision DEFAULT 1,
	"status" text DEFAULT 'pending' NOT NULL,
	"resolved_entry_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"clerk_subject" text NOT NULL,
	"username" text,
	"display_name" text,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_clerk_subject_unique" UNIQUE("clerk_subject"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "achievement_bullets" ADD CONSTRAINT "achievement_bullets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achievement_bullets" ADD CONSTRAINT "achievement_bullets_entry_id_bank_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."bank_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_runs" ADD CONSTRAINT "ai_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_resume_version_id_resume_versions_id_fk" FOREIGN KEY ("resume_version_id") REFERENCES "public"."resume_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "background_jobs" ADD CONSTRAINT "background_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_entries" ADD CONSTRAINT "bank_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bullet_facts" ADD CONSTRAINT "bullet_facts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bullet_facts" ADD CONSTRAINT "bullet_facts_bullet_id_achievement_bullets_id_fk" FOREIGN KEY ("bullet_id") REFERENCES "public"."achievement_bullets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bullet_facts" ADD CONSTRAINT "bullet_facts_entry_id_bank_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."bank_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bullet_relations" ADD CONSTRAINT "bullet_relations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bullet_relations" ADD CONSTRAINT "bullet_relations_source_bullet_id_achievement_bullets_id_fk" FOREIGN KEY ("source_bullet_id") REFERENCES "public"."achievement_bullets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bullet_relations" ADD CONSTRAINT "bullet_relations_target_bullet_id_achievement_bullets_id_fk" FOREIGN KEY ("target_bullet_id") REFERENCES "public"."achievement_bullets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cover_letters" ADD CONSTRAINT "cover_letters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cover_letters" ADD CONSTRAINT "cover_letters_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cover_letters" ADD CONSTRAINT "cover_letters_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jd_analyses" ADD CONSTRAINT "jd_analyses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jd_analyses" ADD CONSTRAINT "jd_analyses_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_credentials" ADD CONSTRAINT "provider_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resume_documents" ADD CONSTRAINT "resume_documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resume_documents" ADD CONSTRAINT "resume_documents_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resume_versions" ADD CONSTRAINT "resume_versions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resume_versions" ADD CONSTRAINT "resume_versions_resume_document_id_resume_documents_id_fk" FOREIGN KEY ("resume_document_id") REFERENCES "public"."resume_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_resume_version_id_resume_versions_id_fk" FOREIGN KEY ("resume_version_id") REFERENCES "public"."resume_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_evidence" ADD CONSTRAINT "source_evidence_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_evidence" ADD CONSTRAINT "source_evidence_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staged_items" ADD CONSTRAINT "staged_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staged_items" ADD CONSTRAINT "staged_items_batch_id_import_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."import_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "achievement_bullets_user_entry_sort_idx" ON "achievement_bullets" USING btree ("user_id","entry_id","sort_order","id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "achievement_bullets_search_vector_idx" ON "achievement_bullets" USING gin ("search_vector") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "ai_runs_user_task_created_idx" ON "ai_runs" USING btree ("user_id","task_type","created_at");--> statement-breakpoint
CREATE INDEX "applications_user_status_followup_idx" ON "applications" USING btree ("user_id","status","follow_up_at","id");--> statement-breakpoint
CREATE INDEX "audit_events_user_action_idx" ON "audit_events" USING btree ("user_id","action","created_at");--> statement-breakpoint
CREATE INDEX "background_jobs_user_status_idx" ON "background_jobs" USING btree ("user_id","status","lease_expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "background_jobs_idempotency_idx" ON "background_jobs" USING btree ("user_id","idempotency_key") WHERE idempotency_key IS NOT NULL;--> statement-breakpoint
CREATE INDEX "bank_entries_user_type_updated_idx" ON "bank_entries" USING btree ("user_id","entry_type","updated_at","id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "bank_entries_user_updated_idx" ON "bank_entries" USING btree ("user_id","updated_at","id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "bank_entries_search_vector_idx" ON "bank_entries" USING gin ("search_vector") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "bullet_facts_user_bullet_idx" ON "bullet_facts" USING btree ("user_id","bullet_id");--> statement-breakpoint
CREATE INDEX "bullet_facts_user_entry_idx" ON "bullet_facts" USING btree ("user_id","entry_id");--> statement-breakpoint
CREATE INDEX "bullet_relations_user_source_idx" ON "bullet_relations" USING btree ("user_id","source_bullet_id");--> statement-breakpoint
CREATE INDEX "bullet_relations_user_target_idx" ON "bullet_relations" USING btree ("user_id","target_bullet_id");--> statement-breakpoint
CREATE INDEX "cover_letters_user_job_idx" ON "cover_letters" USING btree ("user_id","job_id");--> statement-breakpoint
CREATE INDEX "import_batches_user_created_idx" ON "import_batches" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "jd_analyses_user_job_idx" ON "jd_analyses" USING btree ("user_id","job_id");--> statement-breakpoint
CREATE INDEX "jobs_user_created_idx" ON "jobs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "jobs_user_hash_idx" ON "jobs" USING btree ("user_id","content_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_credentials_user_provider_idx" ON "provider_credentials" USING btree ("user_id","provider");--> statement-breakpoint
CREATE INDEX "resume_documents_user_updated_idx" ON "resume_documents" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "resume_versions_user_doc_num_idx" ON "resume_versions" USING btree ("user_id","resume_document_id","version_number");--> statement-breakpoint
CREATE INDEX "resume_versions_user_document_version_idx" ON "resume_versions" USING btree ("user_id","resume_document_id","version_number");--> statement-breakpoint
CREATE INDEX "share_links_user_expiry_idx" ON "share_links" USING btree ("user_id","expires_at") WHERE revoked_at IS NULL;--> statement-breakpoint
CREATE INDEX "source_evidence_user_source_idx" ON "source_evidence" USING btree ("user_id","source_id");--> statement-breakpoint
CREATE INDEX "sources_user_created_idx" ON "sources" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "staged_items_user_batch_status_idx" ON "staged_items" USING btree ("user_id","batch_id","status");--> statement-breakpoint
CREATE INDEX "users_username_idx" ON "users" USING btree ("username");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");