BEGIN;

UPDATE public.services
SET description = 'טיפול ג''ל נקי ומוקפד למראה מסודר ועמיד.'
WHERE name = 'מניקור ג''ל'
  AND description IS NULL;

UPDATE public.services
SET description = 'טיפול רגליים מסודר עם גימור ג''ל נקי.'
WHERE name = 'פדיקור ג''ל'
  AND description IS NULL;

UPDATE public.services
SET description = 'בניית ציפורניים מלאה עם התאמה לאורך ולסגנון הרצוי.'
WHERE name = 'בניית ציפורניים'
  AND description IS NULL;

COMMIT;
