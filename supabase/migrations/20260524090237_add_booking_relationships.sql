-- Restore the database relationships the app needs to display bookings with
-- their client, master, and selected service.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'bookings_master_id_fkey'
    ) THEN
        ALTER TABLE public.bookings
            ADD CONSTRAINT bookings_master_id_fkey
            FOREIGN KEY (master_id) REFERENCES public.users(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'bookings_client_id_fkey'
    ) THEN
        ALTER TABLE public.bookings
            ADD CONSTRAINT bookings_client_id_fkey
            FOREIGN KEY (client_id) REFERENCES public.users(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'bookings_service_id_fkey'
    ) THEN
        ALTER TABLE public.bookings
            ADD CONSTRAINT bookings_service_id_fkey
            FOREIGN KEY (service_id) REFERENCES public.services(id);
    END IF;
END;
$$;
