CREATE TABLE IF NOT EXISTS user_settings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  default_page_size TEXT NOT NULL DEFAULT 'A4',
  default_template_id TEXT NOT NULL DEFAULT 'classic-ats',
  theme_preference TEXT NOT NULL DEFAULT 'system',
  retention_policy TEXT NOT NULL DEFAULT 'discard_raw',
  portfolio_theme TEXT NOT NULL DEFAULT 'editorial',
  show_view_counters BOOLEAN NOT NULL DEFAULT true,
  privacy_terms_version TEXT NOT NULL DEFAULT '2026-11-18',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS user_settings_user_idx ON user_settings(user_id);
--> statement-breakpoint
ALTER TABLE users ADD COLUMN IF NOT EXISTS portfolio_views INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE share_links ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE share_links ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMP WITH TIME ZONE;
