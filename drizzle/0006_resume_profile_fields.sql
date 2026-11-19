ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_email TEXT;
--> statement-breakpoint
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
--> statement-breakpoint
ALTER TABLE users ADD COLUMN IF NOT EXISTS location TEXT;
--> statement-breakpoint
ALTER TABLE users ADD COLUMN IF NOT EXISTS headline TEXT;
--> statement-breakpoint
ALTER TABLE users ADD COLUMN IF NOT EXISTS github_url TEXT;
--> statement-breakpoint
ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
--> statement-breakpoint
ALTER TABLE users ADD COLUMN IF NOT EXISTS portfolio_url TEXT;
