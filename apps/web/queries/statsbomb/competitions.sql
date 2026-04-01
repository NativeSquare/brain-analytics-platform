SELECT DISTINCT
  competition_id,
  competition_name
FROM silver.matches
WHERE competition_id IS NOT NULL
  AND competition_name IS NOT NULL
ORDER BY competition_name;
