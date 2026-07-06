-- OTP Verification Table
-- Stores one-time passwords issued during login

CREATE TABLE IF NOT EXISTS otp_verifications (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  otp_code     TEXT        NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  verified     BOOLEAN     NOT NULL DEFAULT FALSE,
  attempt_count INT        NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_otp_verifications_user_id
  ON otp_verifications (user_id, created_at DESC);

-- Enable RLS
ALTER TABLE otp_verifications ENABLE ROW LEVEL SECURITY;

-- Users can only read/update their own OTP rows
CREATE POLICY "users_own_otp_select"
  ON otp_verifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_own_otp_update"
  ON otp_verifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can insert (used by Edge Function)
CREATE POLICY "service_role_otp_insert"
  ON otp_verifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "service_role_otp_delete"
  ON otp_verifications FOR DELETE
  USING (true);
