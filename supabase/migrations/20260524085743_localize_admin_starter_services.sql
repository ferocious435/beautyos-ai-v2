-- Keep the starter service names aligned with the Hebrew product experience.

UPDATE public.services
SET name = CASE name
    WHEN 'Manicure gel polish' THEN 'מניקור ג''ל'
    WHEN 'Pedicure gel polish' THEN 'פדיקור ג''ל'
    WHEN 'Nail building' THEN 'בניית ציפורניים'
    ELSE name
END
WHERE name IN ('Manicure gel polish', 'Pedicure gel polish', 'Nail building');
