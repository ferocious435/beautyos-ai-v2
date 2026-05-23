-- Make available slots respect the selected service duration and master day settings.

DROP FUNCTION IF EXISTS public.get_available_slots(BIGINT, DATE);

CREATE OR REPLACE FUNCTION public.get_available_slots(m_id BIGINT, requested_service_id UUID, select_date DATE)
RETURNS TABLE (slot_time TIMESTAMPTZ)
LANGUAGE plpgsql
AS $$
DECLARE
    master_uuid UUID;
    target_start TIMESTAMPTZ;
    target_end TIMESTAMPTZ;
    current_time_slot TIMESTAMPTZ;
    work_start TIME;
    work_end TIME;
    is_working_day BOOLEAN;
    service_duration_mins INTEGER := 60;
    slot_end_time TIMESTAMPTZ;
BEGIN
    SELECT id INTO master_uuid FROM public.users WHERE telegram_id = m_id LIMIT 1;

    IF master_uuid IS NULL THEN
        RETURN;
    END IF;

    IF requested_service_id IS NOT NULL THEN
        SELECT duration_mins
        INTO service_duration_mins
        FROM public.services
        WHERE id = requested_service_id
          AND master_id = master_uuid
          AND is_active = TRUE
        LIMIT 1;
    END IF;

    service_duration_mins := GREATEST(COALESCE(service_duration_mins, 60), 15);

    SELECT
        ms.start_time,
        ms.end_time,
        ms.is_working
    INTO work_start, work_end, is_working_day
    FROM public.master_schedules ms
    WHERE ms.master_id = master_uuid
      AND ms.day_of_week = EXTRACT(DOW FROM select_date)::INTEGER
    LIMIT 1;

    IF is_working_day = FALSE THEN
        RETURN;
    END IF;

    target_start := select_date + COALESCE(work_start, time '09:00:00');
    target_end := select_date + COALESCE(work_end, time '19:00:00');

    IF target_end <= target_start THEN
        RETURN;
    END IF;

    current_time_slot := target_start;

    WHILE current_time_slot + make_interval(mins => service_duration_mins) <= target_end LOOP
        slot_end_time := current_time_slot + make_interval(mins => service_duration_mins);

        IF NOT EXISTS (
            SELECT 1
            FROM public.bookings
            WHERE master_id = master_uuid
              AND status IN ('pending', 'confirmed')
              AND tstzrange(start_time, end_time, '[)') && tstzrange(current_time_slot, slot_end_time, '[)')
        ) THEN
            slot_time := current_time_slot;
            RETURN NEXT;
        END IF;

        current_time_slot := current_time_slot + interval '15 minutes';
    END LOOP;
END;
$$;

ALTER FUNCTION public.get_available_slots(BIGINT, UUID, DATE)
SET search_path = public, pg_temp;
