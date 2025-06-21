ALTER TABLE public.user_conditions
ADD COLUMN name_normalized TEXT;

CREATE INDEX IF NOT EXISTS idx_user_conditions_name_normalized ON public.user_conditions (user_id, name_normalized);

COMMENT ON COLUMN public.user_conditions.name_normalized IS 'A normalized version of the condition name for deduplication.';

ALTER TABLE public.user_conditions
ADD CONSTRAINT unique_user_condition_normalized UNIQUE (user_id, name_normalized);
