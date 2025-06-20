-- Add a user-friendly display column for conditions
ALTER TABLE disability_estimates
ADD COLUMN IF NOT EXISTS condition_display text;

-- Backfill existing rows with the current value of condition
UPDATE disability_estimates SET condition_display = condition WHERE condition_display IS NULL; 