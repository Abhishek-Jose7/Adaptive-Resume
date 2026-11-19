-- Migration 0005: Persistent OCR Consent & Distributed Serverless Rate Limits
-- PRD Section 11.3 & Independent Hostile Verification Finding 1

CREATE TABLE IF NOT EXISTS user_ocr_consents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  policy_version TEXT NOT NULL,
  consented_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  revoked_at TIMESTAMP WITH TIME ZONE
);

CREATE UNIQUE INDEX IF NOT EXISTS user_ocr_consents_user_idx ON user_ocr_consents(user_id);
CREATE INDEX IF NOT EXISTS user_ocr_consents_user_policy_idx ON user_ocr_consents(user_id, policy_version);

CREATE TABLE IF NOT EXISTS ocr_rate_limits (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  window_type TEXT NOT NULL,
  window_key TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ocr_rate_limits_user_window_idx ON ocr_rate_limits(user_id, window_type, window_key);
CREATE INDEX IF NOT EXISTS ocr_rate_limits_expires_idx ON ocr_rate_limits(expires_at);
