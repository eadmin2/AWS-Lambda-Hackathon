CREATE TABLE IF NOT EXISTS processed_webhook_events (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    stripe_event_id TEXT NOT NULL UNIQUE,
    event_type TEXT,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add an index for faster lookups on the event ID
CREATE INDEX IF NOT EXISTS idx_stripe_event_id ON public.processed_webhook_events(stripe_event_id); 