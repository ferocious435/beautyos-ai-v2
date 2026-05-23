-- Lock down public table access. The app serves data through Vercel API routes
-- that validate Telegram initData and use the Supabase service role.

BEGIN;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE
    public.users,
    public.services,
    public.master_schedules,
    public.bookings,
    public.portfolio,
    public.bot_sessions,
    public.market_trends,
    public.analytics_events
FROM anon, authenticated;

DROP POLICY IF EXISTS "Users are viewable by everyone" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "User reads are server only" ON public.users;
DROP POLICY IF EXISTS "User writes are server only" ON public.users;

DROP POLICY IF EXISTS "Services are viewable by everyone" ON public.services;
DROP POLICY IF EXISTS "Masters can edit services" ON public.services;
DROP POLICY IF EXISTS "Service reads are server only" ON public.services;
DROP POLICY IF EXISTS "Service writes are server only" ON public.services;

DROP POLICY IF EXISTS "Schedules are viewable by everyone" ON public.master_schedules;
DROP POLICY IF EXISTS "Schedule reads are server only" ON public.master_schedules;

DROP POLICY IF EXISTS "View involved bookings" ON public.bookings;
DROP POLICY IF EXISTS "Create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Update bookings" ON public.bookings;
DROP POLICY IF EXISTS "Booking reads are server only" ON public.bookings;
DROP POLICY IF EXISTS "Booking writes are server only" ON public.bookings;

DROP POLICY IF EXISTS "Portfolio is viewable by everyone" ON public.portfolio;
DROP POLICY IF EXISTS "Public can view portfolio" ON public.portfolio;
DROP POLICY IF EXISTS "Portfolio reads are server only" ON public.portfolio;
DROP POLICY IF EXISTS "Portfolio writes are server only" ON public.portfolio;

-- No anon/authenticated policies are created here. With RLS enabled and direct
-- table grants revoked, browser clients are denied by default while Vercel API
-- routes use the service role for validated server-side access.

ALTER FUNCTION public.get_available_slots(BIGINT, DATE)
SET search_path = public, pg_temp;

COMMIT;
