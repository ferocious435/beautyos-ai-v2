-- Give the first admin a practical starter menu so the booking flow is usable immediately.
-- These services are normal records and can be edited or deleted from Settings.

INSERT INTO public.services (master_id, name, duration_mins, price, is_active)
SELECT admin_user.id, starter.name, starter.duration_mins, starter.price, TRUE
FROM (
    SELECT id
    FROM public.users
    WHERE role = 'admin'
    ORDER BY created_at ASC
    LIMIT 1
) AS admin_user
CROSS JOIN (
    VALUES
        ('Manicure gel polish', 60, 120),
        ('Pedicure gel polish', 75, 150),
        ('Nail building', 120, 260)
) AS starter(name, duration_mins, price)
WHERE NOT EXISTS (
    SELECT 1
    FROM public.services existing
    WHERE existing.master_id = admin_user.id
      AND existing.name = starter.name
);
