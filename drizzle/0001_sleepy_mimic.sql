CREATE TABLE "application_interviews" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"application_id" text NOT NULL,
	"round_name" text NOT NULL,
	"round_number" integer DEFAULT 1 NOT NULL,
	"scheduled_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"interviewers" text,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"feedback_notes" text,
	"prep_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "career_graph_edges" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"source_type" text NOT NULL,
	"source_id" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"relationship_type" text NOT NULL,
	"weight" double precision DEFAULT 1,
	"metadata_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_metadata" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"entry_id" text NOT NULL,
	"maturity_level" text DEFAULT 'functional_prototype' NOT NULL,
	"actual_contribution" text,
	"implementation_gaps" text,
	"unfinished_features" text,
	"limitations" text,
	"is_production_ready" boolean DEFAULT false NOT NULL,
	"architecture_notes" text,
	"repository_url" text,
	"live_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quantification_interviews" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"entry_id" text,
	"bullet_id" text,
	"question_key" text NOT NULL,
	"prompt_question" text NOT NULL,
	"user_response" text,
	"metric_estimate" double precision,
	"metric_unit" text,
	"is_verified" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_usage_quotas" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"monthly_period" text NOT NULL,
	"ai_tokens_consumed" integer DEFAULT 0 NOT NULL,
	"ai_generations_count" integer DEFAULT 0 NOT NULL,
	"exports_generated_count" integer DEFAULT 0 NOT NULL,
	"active_resumes_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "application_interviews" ADD CONSTRAINT "application_interviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_interviews" ADD CONSTRAINT "application_interviews_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_graph_edges" ADD CONSTRAINT "career_graph_edges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_metadata" ADD CONSTRAINT "project_metadata_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_metadata" ADD CONSTRAINT "project_metadata_entry_id_bank_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."bank_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quantification_interviews" ADD CONSTRAINT "quantification_interviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quantification_interviews" ADD CONSTRAINT "quantification_interviews_entry_id_bank_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."bank_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quantification_interviews" ADD CONSTRAINT "quantification_interviews_bullet_id_achievement_bullets_id_fk" FOREIGN KEY ("bullet_id") REFERENCES "public"."achievement_bullets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_usage_quotas" ADD CONSTRAINT "user_usage_quotas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "app_interviews_user_app_idx" ON "application_interviews" USING btree ("user_id","application_id");--> statement-breakpoint
CREATE INDEX "career_graph_user_source_idx" ON "career_graph_edges" USING btree ("user_id","source_type","source_id");--> statement-breakpoint
CREATE INDEX "career_graph_user_target_idx" ON "career_graph_edges" USING btree ("user_id","target_type","target_id");--> statement-breakpoint
CREATE INDEX "career_graph_user_rel_idx" ON "career_graph_edges" USING btree ("user_id","relationship_type");--> statement-breakpoint
CREATE UNIQUE INDEX "project_metadata_user_entry_idx" ON "project_metadata" USING btree ("user_id","entry_id");--> statement-breakpoint
CREATE INDEX "quant_interviews_user_bullet_idx" ON "quantification_interviews" USING btree ("user_id","bullet_id");--> statement-breakpoint
CREATE INDEX "quant_interviews_user_entry_idx" ON "quantification_interviews" USING btree ("user_id","entry_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_usage_quotas_user_period_idx" ON "user_usage_quotas" USING btree ("user_id","monthly_period");