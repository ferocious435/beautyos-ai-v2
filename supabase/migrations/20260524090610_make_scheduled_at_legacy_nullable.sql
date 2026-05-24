-- The app now uses start_time and end_time. scheduled_at remains only for
-- older compatibility and must not block new bookings.

ALTER TABLE public.bookings
    ALTER COLUMN scheduled_at DROP NOT NULL;
