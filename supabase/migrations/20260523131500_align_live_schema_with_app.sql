-- Bring older production databases in line with the current app contract.
-- This is additive/backfill-first: old columns remain until a later cleanup.

BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

ALTER TABLE public.users
  ALTER COLUMN first_name DROP NOT NULL,
  ALTER COLUMN first_name SET DEFAULT 'User';

UPDATE public.users
SET full_name = trim(coalesce(full_name, concat_ws(' ', first_name, last_name, username, '')))
WHERE full_name IS NULL OR full_name = '';

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS total_price NUMERIC,
  ADD COLUMN IF NOT EXISTS notified_24h BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS notified_3h BOOLEAN DEFAULT FALSE;

UPDATE public.bookings
SET
  start_time = COALESCE(start_time, scheduled_at),
  end_time = COALESCE(end_time, scheduled_at + interval '60 minutes')
WHERE scheduled_at IS NOT NULL
  AND (start_time IS NULL OR end_time IS NULL);

ALTER TABLE public.portfolio
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'original',
  ADD COLUMN IF NOT EXISTS metadata JSONB;

UPDATE public.portfolio
SET user_id = COALESCE(user_id, master_id)
WHERE user_id IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bookings'
      AND column_name = 'start_time'
  ) THEN
    ALTER TABLE public.bookings
      ALTER COLUMN start_time SET NOT NULL,
      ALTER COLUMN end_time SET NOT NULL;
  END IF;
END;
$$;

COMMIT;
