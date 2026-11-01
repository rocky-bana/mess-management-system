-- Active: 1793532734774@@ep-dawn-band-asx02q3r.c-4.eu-central-1.aws.neon.tech@5432@neondb
-- Adds the user link, meal date and meal type to feedback for existing databases.
-- Safe to run more than once.

ALTER TABLE feedback ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users (user_id) ON DELETE SET NULL;

ALTER TABLE feedback ADD COLUMN IF NOT EXISTS meal_date DATE NOT NULL DEFAULT CURRENT_DATE;

ALTER TABLE feedback ADD COLUMN IF NOT EXISTS meal_type meal_type;

-- One feedback per user per meal slot. A NULL meal_type (whole day) is its own slot.
CREATE UNIQUE INDEX IF NOT EXISTS uq_feedback_user_meal ON feedback (user_id, meal_date, meal_type) WHERE meal_type IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_feedback_user_whole_day ON feedback (user_id, meal_date) WHERE meal_type IS NULL;

-- Index to quickly look up feedback for a specific day and meal
CREATE INDEX IF NOT EXISTS idx_feedback_day_meal ON feedback (meal_date, meal_type);
