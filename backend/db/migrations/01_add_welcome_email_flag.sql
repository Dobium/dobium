-- Add a boolean flag to track if the welcome email has been sent
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS welcome_email_sent BOOLEAN DEFAULT FALSE;

-- Immediately set the flag to TRUE for all existing users 
-- so they do not receive duplicate welcome emails on the next deploy
UPDATE users SET welcome_email_sent = TRUE;