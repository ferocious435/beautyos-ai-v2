-- Remove redundant deny policies. RLS without direct grants already denies
-- anon/authenticated clients, and service-role API routes continue to work.

DROP POLICY IF EXISTS "User reads are server only" ON public.users;
DROP POLICY IF EXISTS "User writes are server only" ON public.users;
DROP POLICY IF EXISTS "Service reads are server only" ON public.services;
DROP POLICY IF EXISTS "Service writes are server only" ON public.services;
DROP POLICY IF EXISTS "Schedule reads are server only" ON public.master_schedules;
DROP POLICY IF EXISTS "Booking reads are server only" ON public.bookings;
DROP POLICY IF EXISTS "Booking writes are server only" ON public.bookings;
DROP POLICY IF EXISTS "Portfolio reads are server only" ON public.portfolio;
DROP POLICY IF EXISTS "Portfolio writes are server only" ON public.portfolio;
